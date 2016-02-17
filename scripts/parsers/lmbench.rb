#! /usr/bin/env ruby

require 'find'
require 'json'
require 'pp'

class MatchData
  def to_h
    Hash[names.map(&:to_sym).zip(captures)]
  end
end

class LmBenchLogParser
  def self.parse(file_path)
    content = File.open(file_path).read
    blocks = filter_blocks(split_to_block(content))
    core_num = LmBenchLogPath.core_num(file_path)
    performances = flatten_result(blocks.map { |block| { block[:title] => parse_block(block) } })
    { core_num: core_num, performances: performances }
  end

  def self.split_to_block(content)
    better_regex = /( - (bigger|smaller) is better)/
    unit_regex = %r{(( -)? (\w+) in ([\w|/]+))}
    title_regex = /([^\n]+?)/

    content.scan(/#{title_regex}#{unit_regex}?#{better_regex}?\n(.+?)\n\n/m).map do |block|
      {
        title: block[0].strip,
        label: block[3],
        unit: block[4],
        better: block[6],
        body: block[7]
      }
    end
  end

  def self.parse_block(block)
    column_ranges = column_ranges(block)
    headers = parse_header(block, column_ranges)
    values = parse_body(block, column_ranges);

    results = headers.map.with_index do |header, i|
      { header => values.map { |value| value[i] }}
    end

    merged_results = results.each_with_object({}) { |result, h| result.each { |k, v| h[k] = v } }
    filter_result(merged_results)
  end

  def self.parse_header(block, column_ranges)
    header_top_regex = /-+\n/
    header_bottom_regex = /(-+ )+-+\s+/
    header_lines = block[:body].match(/#{header_top_regex}(?<header_body>.+?)#{header_bottom_regex}/m) do |match|
      multi_columns = multi_columns(block, match[:header_body].lines)

      headers = match[:header_body].lines.map do |line|
        column_ranges.map { |range| line.slice(range) }.compact.map(&:strip)
      end

      headers.map.with_index do |header, header_idx|
        header.map.with_index do |col, idx|
          multi_column = multi_columns.find { |c| c[:index].begin == idx || c[:index].end == idx }

          if !multi_column.nil? && header_idx == 0
            ''
          else
            multi_column.nil? ? col : "#{headers.first[multi_column[:index].begin]}#{multi_column[:char]}#{headers.first[multi_column[:index].end]} #{col}"
          end
        end
      end
    end

    header_lines.inject { |a, e| a.zip(e) }.map { |line| line.flatten.join(' ').strip }.select { |line| line != '' }
  end

  def self.parse_body(block, column_ranges)
    header_bottom_regex = /(-+ )+-+\s+/
    body_lines = block[:body].match(/#{header_bottom_regex}(?<body>.+)/m) do |match|
      match[:body].lines.map { |line| column_ranges.map { |range| line.slice(range) }.compact.map(&:strip) }
    end
  end

  def self.filter_blocks(blocks)
    blocks.select { |block| !block[:title].include?('L M B E N C H') }
  end

  def self.filter_result(result)
    ignores = %w(Host OS Description Mhz)

    result.keys.select { |key| !ignores.include?(key) }.each_with_object({}) { |k, h| h[k] = result[k] }
  end

  def self.flatten_result(result)
    result.each_with_object({}) do |blocks, h|
      blocks.each { |k, v| h[k] = v }
    end
  end

  def self.column_ranges(block)
    (block[:body]).match(/(-+ )+-+\s+/) do |match|
      header_bottom = match[0]
      spaces = [-1] + (0...header_bottom.length).find_all { |i| header_bottom[i] == ' ' } + [header_bottom.length - 1]
      spaces.map.with_index { |val, idx| (spaces[idx] + 1..spaces[idx + 1] - 1) unless spaces[idx + 1].nil? }.compact
    end
  end

  def self.multi_columns(block, header_lines)
    (block[:body]).match(/(-+ )+-+\s+/) do |match|
      header_bottom = match[0]
      spaces = (0...header_bottom.length).find_all { |i| header_bottom[i] == ' ' }

      spaces.select { |space| !(/\s/ =~ header_lines.first[space] || /\s/ =~ header_lines.first[space + 1]) }.map do |space|
        multi_column_index = spaces.index(space)
        { index: (multi_column_index..multi_column_index + 1), char: header_lines.first[space] }
      end
    end
  end
end

class LmBenchLogPath
  def self.core_num(file_path)
    File.basename(File.dirname(file_path))
  end
end

class LmBenchLogAggregator
  def self.average(logs)
    logs.each_with_object({}) do |(core_num, performances), result|
      result[core_num] = performances.each_with_object({}) do |(main_category, values), main|
        main[main_category] = values.each_with_object({}) do |(sub_category, values), sub|
          old_average = average = values.reduce(0) { |sum, value| sum + value[:old] } / values.size
          new_average = average = values.reduce(0) { |sum, value| sum + value[:new] } / values.size

          ratio = new_average != 0 ? (new_average - old_average) * 100 / new_average : 0
          sub[sub_category] = { values: values, averages: { old: old_average, new: new_average }, ratio: ratio }
        end
      end
    end
  end
end

class LmBenchLogComparator
  def self.compare(old_logs, new_logs)
    old_logs.each_with_object({}) do |(core_num, performances), result|
      result[core_num] = performances.each_with_object({}) do |(title, key_values), block|
        block[title] = key_values.each_with_object({}) do |(key, old_values), h|
          h[key] = new_logs[core_num][title][key].map.with_index do |new_value, idx|
            old_value = old_values[idx]

            {
              old: old_value.to_f,
              new: new_value.to_f,
            }
          end
        end
      end
    end
  end
end

class LmBenchLogLoader
  def self.load(base_dir)
    log_files(base_dir).map { |l| LmBenchLogParser.parse(l) }
      .each_with_object({}) {|kv, h| h["#{kv[:core_num]}"] = kv[:performances]}
  end

  private_class_method
  def self.log_files(base_dir)
    Find.find(base_dir).select { |f| FileTest.file?(f) && /.*summary.txt$/ =~ f }
  end
end

old_file = ARGV[0]
new_file = ARGV[1]

if !old_file.nil? && new_file.nil?
  print LmBenchLogParser.parse(old_file).to_json
elsif !old_file.nil? && !new_file.nil?
  print LmBenchLogAggregator.average(LmBenchLogComparator.compare(LmBenchLogLoader.load(old_file), LmBenchLogLoader.load(new_file))).to_json
else
  print_usage_and_exit
end
