#! /usr/bin/env ruby

require 'json'
require 'pp'
require "open3"

target_file = ARGV[0]

dirs = Dir.glob("#{target_file}/*/").select do |f|
  FileTest.directory?(f)
end

results = dirs.each_with_object({}) do |dir, result|
  out, err = Open3.capture3("python #{File.expand_path(File.dirname(__FILE__))}/netperf.py #{dir}")

  if out == '' && err != ''
    STDERR.puts(err)
    exit(-1)
  end

  result[File.basename(dir)] = JSON.parse(out)
end

print results.to_json
