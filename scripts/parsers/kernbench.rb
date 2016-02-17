#! /usr/bin/env ruby

require 'find'
require 'json'

require 'pp'
class KBLogParser
  def self.parse(file_name)
    elapsed_times = parse_elapsed_time(file_name)
                    .each_with_object({}) { |m, h| h[m[0] || 1] = m[1] }

    { core_num: KBLogPath.core_num(file_name), elapsed_times: elapsed_times }
  end

  def self.parse_elapsed_time(file_name)
    File.open(file_name).read
      .gsub(/\s/, '')
      .scan(/Average\w+(-j(?<thread_num>\d+))?Run\(stddeviation\):ElapsedTime(?<elapsed_time>[\d|\.]+)/)
  end
end

class KBLogPath
  def self.core_num(file_path)
    File.basename(File.dirname(file_path))
  end

  def self.arch(file_path)
    File.basename(File.dirname(File.dirname(file_path)))
  end
end

class KBLogLoader
  def self.load(base_dir)
    log_files(base_dir).map { |l| KBLogParser.parse(l) }
      .each_with_object({}) {|kv, h| h["#{kv[:core_num]}"] = kv[:elapsed_times]}
  end

  private_class_method
  def self.log_files(base_dir)
    Find.find(base_dir).select { |f| FileTest.file?(f) && /\w+.log$/ =~ f }
  end
end

class KBLogComparator
  def self.compare(old_logs, new_logs)
    old_logs.each_with_object({}) do |(core_num, old_log), h|
      new_log = new_logs.find { |(cn, _v)| core_num == cn }[1]
      h[core_num] =  diff(old_log, new_log)
    end
  end

  private_class_method
  def self.diff(old_log, new_log)
    elapsed_times = old_log.map do |(thread_num, old_elapsed_time)|
      new_elapsed_time = new_log[thread_num]
      {
        thread_num: thread_num,
        old: old_elapsed_time,
        new: new_elapsed_time,
        ratio: ((new_elapsed_time.to_f / old_elapsed_time.to_f) - 1.0) * 100
      }
    end

    { elapsed_times: elapsed_times }
  end

  def self.same?(old_log, new_log)
    old_log[:core_num] == new_log[:core_num]
  end
end

old_file = ARGV[0]
new_file = ARGV[1]

if !old_file.nil? && new_file.nil?
  print KBLogLoader.load(old_file).to_json
elsif !old_file.nil? && !new_file.nil?
  print KBLogComparator.compare(KBLogLoader.load(old_file), KBLogLoader.load(new_file)).to_json
else
  print_usage_and_exit
end
