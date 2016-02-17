require 'find'
require 'time'
require 'fileutils'
require 'open3'
require 'json'
require 'pp'

VERBOSE = ARGV[2] || false

class ToolType
  KERNBENCH = 'kernbench'
  LMBENCH = 'lmbench'
  NETPERF = 'netperf'
  FIO = 'fio'

  ALL = [FIO, KERNBENCH, LMBENCH, NETPERF]
end

class OutputPath
  def self.root(root, log)
    "#{root}/#{log.tool}/#{log.version}"
  end

  def self.netperf_root(root, log)
    "#{root}/#{log.tool}/#{log.core_num}"
  end
end

class Log
  attr_reader :file_path, :version, :tool, :core_num, :machine, :env, :date
  def initialize(file_path, version, tool, core_num, machine, env, date)
    @file_path = file_path
    @version = version
    @tool = tool
    @core_num = core_num
    @machine = machine
    @env = env
    @date = date
  end

  def self.create_from_filepath(file_path)
    version = File.basename(File.dirname(file_path))
    file_name = File.basename(file_path)

    regex = /(?<date>\d+)_(?<env>\w+)_(?<core_num>\w+)_Core_(?<tool>\w+)_(?<machine>[\w|\d|-]+).tar.bz2/
    result = regex.match(file_name)

    throw "Error: Invalid machine name. #{file_name}" unless result

    Log.new(file_path, version, result[:tool], result[:core_num], result[:machine], result[:env], Time.strptime(result[:date], '%Y%m%d%H%M%S'))
  end
end

class DirConstructor
  def initialize(tool_type)
    @tool_type = tool_type
  end

  def filter_logs(logs)
    logs.select { |log| log.tool == @tool_type }
  end

  def construct(logs, output_dir)
    filter_logs(logs).each do |log|
      tmp_dir = tmp_dir(log, output_dir)
      dst_dir = "#{OutputPath.root(output_dir, log)}/#{log.core_num}"
      FileUtils.mkdir_p(dst_dir)

      Zip.unzip(log.file_path, tmp_dir).each do |entry|
        construct_each(entry, dst_dir)
      end

      FileUtils.rm_r(tmp_dir)
    end
  end

  def tmp_dir(log, output_dir)
    "#{OutputPath.root(output_dir, log)}/tmp"
  end
end

class KernbenchDirConstructor < DirConstructor
  def initialize
    super(ToolType::KERNBENCH)
  end

  def construct_each(entry, dst_dir)
    FileUtils.mv(entry, "#{dst_dir}/#{File.basename(entry)}")
  end
end

class FioDirConstructor < DirConstructor
  def initialize
    super(ToolType::FIO)
  end

  def construct_each(entry, dst_dir)
    Dir.glob("#{entry}/*/*k").each do |log_file_dir|
      FileUtils.mv(log_file_dir, "#{dst_dir}/#{File.basename(log_file_dir)}")
    end
  end
end

class LmbenchDirConstructor < DirConstructor
  def initialize
    super(ToolType::LMBENCH)
  end

  def construct_each(entry, dst_dir)
    Dir.glob("#{entry}/summary.txt").each do |log_file|
      FileUtils.mv(log_file, dst_dir)
    end
  end
end

class NetperfDirConstructor < DirConstructor
  def initialize
    super(ToolType::NETPERF)
  end

  def construct(logs, output_dir)
    filter_logs(logs).each do |log|
      root_dir = OutputPath.netperf_root(output_dir, log)
      tmp_dir = "#{root_dir}/tmp"
      dst_dir = "#{root_dir}/#{log.version}"

      Zip.unzip(log.file_path, tmp_dir).each do |entry|
        construct_each(entry, dst_dir)
      end

      generate_test_case_list(logs, root_dir)
      FileUtils.rm_r(tmp_dir)
    end
  end

  def construct_each(entry, dst_dir)
    FileUtils.mv(entry, dst_dir)
  end

  def generate_test_case_list(logs, dst_dir)
    test_case_list_dir = "#{dst_dir}/test_case_list/pattern"
    test_case_list_file = "#{test_case_list_dir}/test_case_list.txt"
    FileUtils.mkdir_p(test_case_list_dir)

    versions = logs.map(&:version).uniq
    test_case_list_content = versions.join("\n")

    File.open(test_case_list_file, 'w') { |file| file.puts(test_case_list_content) }
  end
end

class CommandExecuter
  def self.exec(command)
    puts command if VERBOSE

    stdout, stderr, status = Open3.capture3(command)

    throw stderr unless stderr.empty?
    throw status if status.exitstatus != 0
    puts stdout if !stdout.empty? && VERBOSE
  end
end

class Zip
  def self.unzip(src, dst)
    FileUtils.mkdir_p(dst)
    CommandExecuter.exec("tar xjf #{src} -C #{dst}")
    Dir.glob("#{dst}/*")
  end

  def self.zip(src, filename)
    CommandExecuter.exec("zip -r #{filename} #{src}")
  end
end

class LogFileExtractor
  def extract(base_dir)
    log_files(base_dir).map { |file| Log.create_from_filepath(file) }
  end

  def log_files(base_dir)
    Find.find(base_dir).select { |f| FileTest.file?(f) && /[\w|_|\d|-]+.tar.bz2$/ =~ f }
  end
end

class LogFilter
  def select_latest(logs)
    grouped_logs = logs.group_by { |log| "#{log.version}_#{log.tool}_#{log.env}_#{log.core_num}_#{log.machine}" }
    latest_logs = grouped_logs.each_with_object({}) { |(group, logs), result| result[group] = logs.sort { |a, b| b.date <=> a.date }.first }
    latest_logs.map { |group, log| log }
  end
end

class DirRebuilder
  def init(output_dir)
    FileUtils.rm_r(output_dir) if File.exist?(output_dir)
    FileUtils.mkdir_p(output_dir)
  end

  def construct(logs, output_dir)
    FileUtils.mkdir_p(output_dir)

    KernbenchDirConstructor.new.construct(logs, output_dir)
    LmbenchDirConstructor.new.construct(logs, output_dir)
    FioDirConstructor.new.construct(logs, output_dir)
    NetperfDirConstructor.new.construct(logs, output_dir)
  end

  def rebuild(all_logs, output_base_dir)
    init(output_base_dir)

    grouped_logs = LogFilter.new.select_latest(all_logs).group_by(&:machine)
    versions = all_logs.map(&:version).uniq

    throw "Error: Invalid number of version directories. (#{versions.length} != 2)" if versions.length != 2

    grouped_logs.each_with_object([]) do |(machine, logs), result|
      output_dir = "#{output_base_dir}/#{machine}"
      construct(logs, output_dir)
      result.push({machine: machine, path: File.expand_path(output_dir)})
    end
  end
end

def zip_results(logs, result, output_base_dir)
  version_string = result[:versions].map { |version| version.gsub(/-|_/, '') }.join('_')
  time_string = Time.now.strftime("%Y%m%d%H%M%S%L")

  result[:logs].each do |log|
    machine_string = log[:machine].gsub(/-|_/, '')

    file_name = "#{version_string}_#{machine_string}-#{time_string}.zip"
    FileUtils.rm(file_name) if File.exist?(file_name)

    output_dir = "#{output_base_dir}/#{log[:machine]}"
    Dir.chdir(output_dir) { Zip.zip('.', file_name) }
    FileUtils.mv("#{output_dir}/#{file_name}", output_base_dir)
    log[:archive_path] = "#{output_base_dir}/#{file_name}"
  end
end

def make_result(logs, log_paths)
  versions = logs.map(&:version).uniq
  json = {
    versions: versions,
    logs: log_paths
  }
end

input_dir = ARGV[0]
output_dir = ARGV[1]

logs = LogFileExtractor.new.extract(input_dir)
log_paths = DirRebuilder.new.rebuild(logs, output_dir)
result = make_result(logs, log_paths)

zip_results(logs, result, output_dir)

print(result.to_json)
