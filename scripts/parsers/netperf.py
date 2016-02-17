#!/usr/bin/python
# -*- coding: utf-8 -*-
#-------------------------------------------------------------------------------
# Name:     netperf_tool
# Purpose:  netperf 結果 / CPU 使用率をマージしてグラフ化
#           
#           ■ディレクトリ構成について
#
#           試験結果および比較パターンは下記のように格納してください
#
#           ./
#           +--netperf_tool.py
#           +--netperf_tool_gnuplot.ini                 ({INIFILE_GNUPLOT})
#           +--<TESTCASE>                               (任意 : test_case_lists)
#              +--{POV_TYPE}_{yymmdd-hhmm}              (任意 : dir_lists)
#                 +--netperf_result                     ({NETPERF_RESULT_DIR})
#                    +--*.rlt                           (netperf_t_{TESTNAME}_l_{DURATION}_m_{BUFSIZE}.rlt)
#                 +--sender_get_resources               ({GET_RESOURCES_SENDER_DIR})
#                 +--receiver_get_resources             ({GET_RESOURCES_RECEIVER_DIR})
#                 +--sender_hypervisor_get_resources    ({GET_RESOURCES_SENDER_HYPERVISOR_DIR})
#                 +--receiver_hypervisor_get_resources  ({GET_RESOURCES_RECEIVER_HYPERVISOR_DIR})
#                    +--*.tar.bz2                       ({HOSTNAME}_netperf_t_{TESTNAME}_l_{DURATION}_m_{BUFSIZE}_{yymmdd-hhmm}.tar.bz2)
#              +--{POV_TYPE}_yymmdd-hhmm
#              :
#           +--<TESTCASE>
#           +--<TESTCASE>
#              :
#           +--TEST_CASE_LIST_DIR                       ({TEST_CASE_LIST_DIR})
#              +--PATTERN_A                             (任意 : test_case_list_dir_lists)
#                 +--each_cpu_usage                     ({EACH_CPU_USAGE_RESULT_DIR})
#                    +--*.dat
#                    +--*.png
#                 +--test_case_list.txt                   ({TEST_CASE_LIST})
#                 +--*.dat
#                 +--*.png
#                 :
#              +--PATTERN_B
#                 +test_case_list.txt
#              :
#
#           ■処理順序 (リスト等の配列要素に対応)
#
#           NETPERF
#            0:TCP_STREAM
#            1:UDP_STREAM BUFSIZE 18    (SENDER)
#            2:UDP_STREAM BUFSIZE 82    (SENDER)
#            3:UDP_STREAM BUFSIZE 210   (SENDER)
#            4:UDP_STREAM BUFSIZE 466   (SENDER)
#            5:UDP_STREAM BUFSIZE 978   (SENDER)
#            6:UDP_STREAM BUFSIZE 1472  (SENDER)
#            7:UDP_STREAM BUFSIZE 18    (RECEIVER)
#            8:UDP_STREAM BUFSIZE 82    (RECEIVER)
#            9:UDP_STREAM BUFSIZE 210   (RECEIVER)
#           10:UDP_STREAM BUFSIZE 466   (RECEIVER)
#           11:UDP_STREAM BUFSIZE 978   (RECEIVER)
#           12:UDP_STREAM BUFSIZE 1472  (RECEIVER)
#           13:TCP_RR
#           14:UDP_RR
#
#           CPU_USAGE
#           0:%usr
#           1:%nice
#           2:%sys
#           3:%iowait
#           4:%irq
#           5:%soft
#           6:%guest
#           7:%gnice (RHEL 7 以降のみ)
#           8:%steal (あまり有用な情報では無いので出力順を最後に調整)
#
# Usage: netperf_tool.py
#
# Author: Hidefumi Moritani <moritani.hidefumi@lab.ntt.co.jp>
#
#         下記の環境での動作を確認しています
#         RHEL 7.0 + Python 2.7.5 + gnuplot 4.6.2
#         Windows7 + Python 2.7.8 + gnuplot 5.0.1
#         (RHEL 6.5 は gnuplot のバージョンによって動かないかも)
#
# Created:     2015/7/14
# Last Update: 2015/8/3
# Version:     0.2.0
#-------------------------------------------------------------------------------

import sys
import os
import glob
import csv
import re
import tarfile
import linecache
import ConfigParser
import math
import subprocess
import pprint
import json

# 詳細出力オプション (0:出力抑止,1:詳細出力)
VERBOSE = 0

INFO = 0

# 集計オプション (0:ALL,1:netperf,2:cpu)
NETPERF_TOOL_MODE=0

# 有効桁数
NDIGITS = 10

if (len(sys.argv) != 2):
    print('usage: ./netperflog_to_json.py <target-dir>')
    sys.exit()

TARGET_DIR = os.path.abspath(sys.argv[1])

os.chdir(TARGET_DIR)

OLD_VERSION = 'old'
NEW_VERSION = 'new'

# 集計結果出力ファイル
NETPERF_TCP_STREAM_RESULT           = 'netperf_tcp_stream_result.dat'
NETPERF_UDP_STREAM_SENDER_RESULT    = 'netperf_udp_stream_sender_result.dat'
NETPERF_UDP_STREAM_RECEIVER_RESULT  = 'netperf_udp_stream_receiver_result.dat'
NETPERF_RR_RESULT                   = 'netperf_rr_result.dat'
CPU_USAGE_TCP_STREAM_RESULT         = 'netperf_tcp_stream_cpu_usage.dat'
CPU_USAGE_UDP_STREAM_RESULT         = 'netperf_udp_stream_cpu_usage.dat'
CPU_USAGE_RR_RESULT                 = 'netperf_rr_cpu_usage.dat'
CPU_USAGE_DATAFILE                  = 'netperf_cpu_usage.dat'
CPU_USAGE_TMPFILE                   = 'netperf_cpu_usage_tmp.dat'

# グラフ出力ファイル
NETPERF_TCP_STREAM_RESULT_PNG           = 'netperf_tcp_stream_result.png'
NETPERF_UDP_STREAM_SENDER_RESULT_PNG    = 'netperf_udp_stream_sender_result.png'
NETPERF_UDP_STREAM_RECEIVER_RESULT_PNG  = 'netperf_udp_stream_receiver_result.png'
NETPERF_RR_RESULT_PNG                   = 'netperf_rr_result.png'
CPU_USAGE_TCP_STREAM_RESULT_PNG         = 'netperf_tcp_stream_cpu_usage.png'
CPU_USAGE_UDP_STREAM_RESULT_PNG         = 'netperf_udp_stream_cpu_usage.png'
CPU_USAGE_RR_RESULT_PNG                 = 'netperf_rr_cpu_usage.png'

# 設定ファイル名 (gnuplot用)
INIFILE_GNUPLOT = 'netperf_tool_gnuplot.ini'

# サブディレクトリ名 (GET_RESOURCES_XXX は _get_resources 前の名称)
NETPERF_RESULT_DIR                    = 'netperf_result'
GET_RESOURCES_DIR                     = '_get_resources'
GET_RESOURCES_SENDER_DIR              = 'sender'
GET_RESOURCES_RECEIVER_DIR            = 'receiver'
GET_RESOURCES_SENDER_HYPERVISOR_DIR   = 'sender_hypervisor'
GET_RESOURCES_RECEIVER_HYPERVISOR_DIR = 'receiver_hypervisor'

# サブディレクトリ名 (各 CPU 使用率の出力ディレクトリ)
EACH_CPU_USAGE_RESULT_DIR = 'each_cpu_usage'

# 比較パターン格納ディレクトリ (./TEST_CASE_LIST_DIR/{比較パターン}/test_case_list.txt)
TEST_CASE_LIST_DIR = 'test_case_list'
# 試験項目リスト
TEST_CASE_LIST = 'test_case_list.txt'

# CPU使用率_集計パターン
CPU_USAGE_TEST_PATTERN = {
    0:GET_RESOURCES_SENDER_DIR,
    1:GET_RESOURCES_RECEIVER_DIR,
    2:GET_RESOURCES_SENDER_HYPERVISOR_DIR,
    3:GET_RESOURCES_RECEIVER_HYPERVISOR_DIR,
}

# CPU使用率_サンプリング間隔 (5分間隔×6行=30分)
CPU_USAGE_SAMPLE_NUM = 6

# gnuplot
DEFAULT_PLT_SETTINGS = """\
set style fill solid border lc rgb 'black'
set palette model RGB defined ( 0 'blue', 1 'red' )
unset colorbox
set boxwidth 1
set key outside
set xtics rotate by -45
set grid ytics
set bmargin 10
"""
#set lmargin 10
#set rmargin 15
#set tmargin 3

# CPU使用率_集計対象
CPU_USAGE_ITEMS = [
    "%usr",
    "%nice",
    "%sys",
    "%iowait",
    "%irq",
    "%soft",
    "%guest",
    "%gnice",
    "%steal",
]

# netperf_集計対象
UDP_STREAM_BUFSIZES = [
    '18',
    '82',
    '210',
    '466',
    '978',
    '1472',
]

UDP_STREAM_BUFSIZE_DIC = {}
for i, bufsize in enumerate(UDP_STREAM_BUFSIZES):
    UDP_STREAM_BUFSIZE_DIC[bufsize] = i

UDP_STREAM_TESTS = []
for bufsize in UDP_STREAM_BUFSIZES:
    UDP_STREAM_TESTS.append("UDP_STREAM_" + bufsize)

TCP_STREAM_TESTS = [
    "TCP_STREAM",
]

RR_TESTS = [
    "TCP_RR",
    "UDP_RR",
]

# gnuplot_netperf_data[x][] / gnuplot_cpu_usage_data[x][][] の要素数
NETPERF_TEST_INDEX   = len(TCP_STREAM_TESTS) + len(UDP_STREAM_TESTS) + len(UDP_STREAM_TESTS) + len(RR_TESTS)
CPU_USAGE_TEST_INDEX = len(TCP_STREAM_TESTS) + len(UDP_STREAM_TESTS) + len(RR_TESTS)

# gnuplot_netperf_data[x][] / gnuplot_cpu_usage_data[x][][]の開始インデックス
NETPERF_TCP_STREAM_TESTS_OFFSET = 0
NETPERF_UDP_STREAM_TESTS_OFFSET = NETPERF_TCP_STREAM_TESTS_OFFSET + len(TCP_STREAM_TESTS)
NETPERF_TCP_RR_TESTS_OFFSET     = NETPERF_UDP_STREAM_TESTS_OFFSET + len(UDP_STREAM_TESTS) + len(UDP_STREAM_TESTS)
NETPERF_UDP_RR_TESTS_OFFSET     = NETPERF_TCP_RR_TESTS_OFFSET + 1

NETPERF_TEST_OFFSET_DIC = {
    "TCP_STREAM":NETPERF_TCP_STREAM_TESTS_OFFSET,
    "UDP_STREAM":NETPERF_UDP_STREAM_TESTS_OFFSET,
    "TCP_RR":NETPERF_TCP_RR_TESTS_OFFSET,
    "UDP_RR":NETPERF_UDP_RR_TESTS_OFFSET,
}

CPU_USAGE_TCP_STREAM_TESTS_OFFSET = 0
CPU_USAGE_UDP_STREAM_TESTS_OFFSET = CPU_USAGE_TCP_STREAM_TESTS_OFFSET + len(TCP_STREAM_TESTS)
CPU_USAGE_TCP_RR_TESTS_OFFSET     = CPU_USAGE_UDP_STREAM_TESTS_OFFSET + len(UDP_STREAM_TESTS)
CPU_USAGE_UDP_RR_TESTS_OFFSET     = CPU_USAGE_TCP_RR_TESTS_OFFSET + 1

CPU_USAGE_TEST_OFFSET_DIC = {
    "TCP_STREAM":CPU_USAGE_TCP_STREAM_TESTS_OFFSET,
    "UDP_STREAM":CPU_USAGE_UDP_STREAM_TESTS_OFFSET,
    "TCP_RR":CPU_USAGE_TCP_RR_TESTS_OFFSET,
    "UDP_RR":CPU_USAGE_UDP_RR_TESTS_OFFSET,
}

class plot_builder(object):
    def __init__(self):
        self.__dataset = {}
        self.__styleattrs = {}
        self.__datafile = ""
        self.__title = None

    def set_datafile(self, value):
        self.__datafile = value

    def set_using(self, value):
        self.__dataset["using"] = value
    
    def set_style(self, value):
        self.__dataset["with"] = value

    def set_style_linewidth(self, value):
        self.__styleattrs["lw"] = value

    def set_style_linecolor(self, value):
        self.__styleattrs["lc"] = value

    def set_title(self, value):
        self.__title = value
    
    def build(self):
        elements = []
        for entry in self.__dataset.items():
            elements.append(" ".join(entry))
            if entry[0] == "with":
                styleattr_items = self.__styleattrs.items()
                elements += [" ".join(item) for item in styleattr_items]

        ret = "'%s' " % self.__datafile
        ret += " ".join(elements)
        if self.__title: ret += " title " + self.__title
        else: ret += " notitle"

        return ret

def test_case_name_to_version(i):
    return OLD_VERSION if i == 0 else NEW_VERSION

def calc_ratio(val):
    return (float(val[NEW_VERSION]) / float(val[OLD_VERSION]) - 1) * 100

def create_common_plt_settings(tests, test_num, outfile, outfile_size_x, outfile_size_y):
    plt = DEFAULT_PLT_SETTINGS
    plt += "set terminal png size %d,%d\n" % (outfile_size_x, outfile_size_y)
    plt += "set xrange [-1:%d]\n" % ((test_num + 1) * len(tests) - 1)
    plt += "set output '%s'\n" % outfile
    for i in range(len(tests)):
        x = (test_num + 1) * i + (test_num - 1) / 2.
        plt += """set label "%s" at %.1f,graph -0.2 center\n""" % (tests[i].replace("_", "\\n"), x)
    return plt

def create_netperf_stream_plt(bandwidth, tests, test_num, infile, outfile, outfile_size_x, outfile_size_y):
    plt = create_common_plt_settings(tests, test_num, outfile, outfile_size_x, outfile_size_y)
    plt += "set ytics %d\n" % (bandwidth / 10)
    plt += "set yrange [0:%d]\n" % bandwidth
    plt += """set ylabel "Throughput (Mbps)"\n"""
    plt += "plot "
    pb = plot_builder()
    pb.set_datafile(infile)
    pb.set_using("(column(-2)*%d+$0):2:($0):xtic(1)" % (test_num + 1))
    pb.set_style("boxes")
    pb.set_style_linewidth("2")
    pb.set_style_linecolor("palette")
    plt += pb.build() + "\n"
    return plt

def probe_max_transactions(infile):
    with open(infile, "r") as f:
        maxval = 0.0
        for line in f:
            if not line: continue
            if line.startswith('#'): continue
            elems = line.split()
            if len(elems) < 2: continue
            try:
                val = float(elems[1])
            except ValueError:
                continue
            else:
                maxval = max(val, maxval)

        maxval = int(math.ceil(maxval))
        return maxval

def create_netperf_rr_plt(tests, test_num, infile, outfile, outfile_size_x, outfile_size_y):
    plt = create_common_plt_settings(tests, test_num, outfile, outfile_size_x, outfile_size_y)
    max_transactions = probe_max_transactions(infile)
    tic = int(math.pow(10, int(math.log10(max_transactions) - 0.7)))
    max_transactions = (max_transactions + tic - 1) / tic * tic
    ytics = max_transactions / 10 / tic * tic
    if ytics == 0:
        ytics = tic
    plt += "set ytics %d\n" % ytics
    plt += "set yrange [0:%d]\n" % max_transactions
    plt += """set ylabel "Transactions (times/sec)"\n"""
    plt += "plot "
    pb = plot_builder()
    pb.set_datafile(infile)
    pb.set_using("(column(-2)*%d+$0):2:($0):xtic(1)" % (test_num + 1))
    pb.set_style("boxes")
    pb.set_style_linewidth("2")
    pb.set_style_linecolor("palette")
    plt += pb.build() + "\n"
    return plt

def create_cpu_usage_plt(tests, test_num, infile, outfile, outfile_size_x, outfile_size_y):
    plt = create_common_plt_settings(tests, test_num, outfile, outfile_size_x, outfile_size_y)
    plt += "set ytics 10\n"
    plt += "set yrange [0:100]\n"
    plt += """set ylabel "CPU Usage (%)"\n"""
    plt += "plot "
    pb = plot_builder()
    pb.set_datafile(infile)
    pb.set_style("boxes")
    pb.set_style_linewidth("2")
    for i in reversed(range(len(CPU_USAGE_ITEMS))):
        yval = ""
        for j in range(i + 1):
            yval += "$" + str(j + 2)
            if j < i: yval += "+"
        pb.set_using("(column(-2)*%d+$0):(%s):xtic(1)" % (test_num + 1, yval))
        pb.set_title("'%s'" % CPU_USAGE_ITEMS[i])
        plt += pb.build()
        if i > 0:
            plt += ",\\\n\t"
        else:
            plt += "\n"
    return plt

def format_plt_for_oneline(plt):
    plt = plt.replace('\\\n', '')
    plt = plt.replace('\n', ';')
    return plt

""" ディレクトリ名の一覧を取得 """
def getdirs(path):
    dirs=[]

    for item in os.listdir(path):
        if os.path.isdir(os.path.join(path, item)):
            dirs.append(item)
    return dirs

""" *.rlt 内の TCP_RR を取得"""
def get_tcp_rr(rlt_list):
    get_value = 0.0    
    with open(rlt_list,"r") as rlt_files:
        # 1 行目が数値であれば super_netperf の実行結果とみなして処理
        # netperf super_netperf2 の場合は文字列となるため ValueError
        try:
            tmpline = rlt_files.readline()
            get_value = float(tmpline.rstrip())
        except ValueError:
            # 残りの行を読み込み 7 - 1(readline分) 行目の
            # 6 列目の Trans. Rate per sec を抽出
            get_value = float(rlt_files.readlines()[5].split()[5])

    return get_value
        
""" *.rlt 内の TCP_STREAM を取得"""
def get_tcp_stream(rlt_list):
    get_value = 0.0    
    with open(rlt_list,"r") as rlt_files:
        # 1 行目が数値であれば super_netperf の実行結果とみなして処理
        # netperf super_netperf2 の場合は文字列となるため ValueError
        try:
            tmpline = rlt_files.readline()
            get_value = float(tmpline.rstrip())
        except ValueError:
            # 残りの行を読み込み 7 - 1(readline分) 行目の
            # 5 列目の Throughput 10^6bits/sec を抽出
            get_value = float(rlt_files.readlines()[5].split()[4])

    return get_value

""" *.rlt 内の UDP_RR を取得"""
def get_udp_rr(rlt_list):
    get_value = 0.0    
    with open(rlt_list,"r") as rlt_files:
        # 1 行目が数値であれば super_netperf の実行結果とみなして処理
        # netperf super_netperf2 の場合は文字列となるため ValueError
        try:
            tmpline = rlt_files.readline()
            get_value = float(tmpline.rstrip())
        except ValueError:
            # 残りの行を読み込み 7 - 1(readline分) 行目の
            # 6 列目の Trans. Rate per sec を抽出
            get_value = float(rlt_files.readlines()[5].split()[5])

    return get_value

""" *.rlt 内の UDP_STREAM_SENDER を取得"""
def get_udp_stream_sender(rlt_list):
    get_value = 0.0    
    with open(rlt_list,"r") as rlt_files:
        # 1 行目が数値であれば super_netperf の実行結果とみなして処理
        # netperf super_netperf2 の場合は文字列となるため ValueError
        try:
            tmpline = rlt_files.readline()
            get_value = float(tmpline.rstrip())
        except ValueError:
            # 残りの行を読み込み 6 - 1 (readline分) 行目の
            # 6 列目の Throughput 10^6bits/sec を抽出して返却
            get_value = float(rlt_files.readlines()[4].split()[5])

    return get_value

""" *.rlt 内の UDP_STREAM_RECEIVER を取得"""
def get_udp_stream_receiver(rlt_list):
    get_value = 0.0    
    with open(rlt_list,"r") as rlt_files:
        # 1 行目が数値であれば super_netperf の実行結果とみなして処理
        # netperf super_netperf2 の場合は文字列となるため ValueError
        try:
            tmpline = rlt_files.readline()
            get_value = float(tmpline.rstrip())
        except ValueError:
            # 残りの行を読み込み 7 - 1 (readline分) 行目の
            # 4 列目の Throughput 10^6bits/sec を抽出して返却
            get_value = float(rlt_files.readlines()[5].split()[3])

    return get_value

""" tar.bz2 内の CPU 使用率を取得 """
def get_cpu_usage_data(tarbz2_list, all_cpu_usage_data, each_cup_usage_data, result_dir_path, cpu_usage_filename):

    # 圧縮ファイル内のファイルリスト
    filelists = []

    # gnice 判定フラグ
    gnice_flg = 0

    # tarbz2_list の tar.bz2 ファイルをオープン
    with tarfile.open(tarbz2_list, 'r') as tarbz2file:

        # 圧縮ファイル内のファイルリストを取得
        filelists = tarbz2file.getnames()
       
        # sar-yyyymmdd.log.txt のファイル名を取得
        r = re.compile(r'^.*sar+.*\.log.*\.txt')
        for filelist in filelists:
            if r.match(filelist):
                sar_log_filename = filelist
                break

        if VERBOSE: print "★☆☆☆ %s を抜き出す" % sar_log_filename

        # sar_log_filename の TarInfo オブジェクトを取得
        tarinfo_sar_log = tarbz2file.getmember(sar_log_filename)
        # TarInfo オブジェクトより sar_log_filename だけ抽出
        f_sar_log = tarbz2file.extractfile(tarinfo_sar_log)

        # sar ログから抽出した CPU 使用率 (all) を出力する一時ファイル名
        src_tmp_filename = result_dir_path + cpu_usage_filename + '_' + CPU_USAGE_TMPFILE

        if VERBOSE: print "★☆☆☆ %s に書き出す" % (src_tmp_filename)

        # 抽出対象の行数
        cpu_usage_line_count = 0

        # CPU 使用率処理フラグ
        cpu_usage_flg = 0

        # CPU 数
        cpu_num = 0

        with open(src_tmp_filename, mode='w') as f_cpu_usage_src_tmp_file:
            # 1 行目にある CPU 数を抽出
            tmpline = f_sar_log.readline()
            cpu_num = int(tmpline.split()[5].replace("(",""))
            if VERBOSE: print "★☆☆☆ CPU 数は %d" % cpu_num

            # 残りの sar_log_filename を 1 行単位で読んでいく
            for f_sar_log_line in f_sar_log:
                # 対象行 (CPU 使用率) の場合
                if cpu_usage_flg == 1:
                    if f_sar_log_line.split()[0] != 'Average:':
                        f_cpu_usage_src_tmp_file.write(f_sar_log_line)

                        # 抽出対象の行数をカウント
                        if f_sar_log_line.split()[1] == 'all':
                            cpu_usage_line_count += 1
                            
                    # Average を含む行以降は不要のため、処理を抜ける
                    else:
                        break
                # 対象行以外の場合
                else:
                    if f_sar_log_line.rstrip().strip() == "":
                        continue
                    else:
                        # 2 列目が CPU で 3 列目が %usr の次の行から処理を開始するためにフラグ設定
                        if f_sar_log_line.split()[1] == 'CPU' \
                           and f_sar_log_line.split()[2] == '%usr':
                            # RHEL 7 系の場合
                            if len(f_sar_log_line.split()) == 12:
                                gnice_flg = 1

                            cpu_usage_flg = 1

        # CPU 使用率 取得範囲の算出
        cpu_usage_sample_min = 0
        cpu_usage_sample_max = 0

        # 抽出対象の行数が CPU_USAGE_SAMPLE_NUM 未満の場合
        if cpu_usage_line_count <= CPU_USAGE_SAMPLE_NUM:
            cpu_usage_sample_min = 0
            cpu_usage_sample_max = cpu_usage_line_count
        else:
            # 真ん中辺りを取ってくるように微調整
            cpu_usage_sample_min = (math.ceil(float(cpu_usage_line_count) / 2) - 2) - 1
            cpu_usage_sample_max = (cpu_usage_sample_min + CPU_USAGE_SAMPLE_NUM) - 1

        if VERBOSE: print "★☆☆☆ CPU 毎の %d - %d (0開始) のCPU使用率を集計" % (cpu_usage_sample_min, cpu_usage_sample_max)
        
        with open(src_tmp_filename, mode='r') as f_cpu_usage_src_file:
            # 読み込み開始位置 (行数)
            start_pos = cpu_usage_sample_min * (cpu_num + 1)

            # 読み込み終了位置 (行数)
            end_pos = (cpu_usage_sample_max * (cpu_num + 1)) + cpu_num

            # all 以外の CPU 使用率
            tmp_cpu_usage_data = [[0 for i in range(len(CPU_USAGE_ITEMS))] for j in range(cpu_num)]

            # cpu_usage_src_file を 1 行づつ処理する
            for i,f_cpu_usage_src_file_line in enumerate(f_cpu_usage_src_file):
                if start_pos <= i and i <= end_pos:
                    # all
                    if f_cpu_usage_src_file_line.split()[1] == 'all':
                        # %usr
                        all_cpu_usage_data[0] += float(f_cpu_usage_src_file_line.split()[2])
                        # %nice
                        all_cpu_usage_data[1] += float(f_cpu_usage_src_file_line.split()[3])
                        # %sys
                        all_cpu_usage_data[2] += float(f_cpu_usage_src_file_line.split()[4])
                        # %iowait
                        all_cpu_usage_data[3] += float(f_cpu_usage_src_file_line.split()[5])
                        # %irq
                        all_cpu_usage_data[4] += float(f_cpu_usage_src_file_line.split()[7])
                        # %soft
                        all_cpu_usage_data[5] += float(f_cpu_usage_src_file_line.split()[8])
                        # %guest
                        all_cpu_usage_data[6] += float(f_cpu_usage_src_file_line.split()[9])
                        # %gnice
                        if gnice_flg == 1:
                            all_cpu_usage_data[7] += float(f_cpu_usage_src_file_line.split()[10])
                        else:
                            all_cpu_usage_data[7] = 0
                        # %steal
                        all_cpu_usage_data[8] += float(f_cpu_usage_src_file_line.split()[6])
                    else:
                        idx = int(f_cpu_usage_src_file_line.split()[1])
                        # %usr
                        tmp_cpu_usage_data[idx][0] += float(f_cpu_usage_src_file_line.split()[2])
                        # %nice
                        tmp_cpu_usage_data[idx][1] += float(f_cpu_usage_src_file_line.split()[3])
                        # %sys
                        tmp_cpu_usage_data[idx][2] += float(f_cpu_usage_src_file_line.split()[4])
                        # %iowait
                        tmp_cpu_usage_data[idx][3] += float(f_cpu_usage_src_file_line.split()[5])
                        # %irq
                        tmp_cpu_usage_data[idx][4] += float(f_cpu_usage_src_file_line.split()[7])
                        # %soft
                        tmp_cpu_usage_data[idx][5] += float(f_cpu_usage_src_file_line.split()[8])
                        # %guest
                        tmp_cpu_usage_data[idx][6] += float(f_cpu_usage_src_file_line.split()[9])
                        # %gnice
                        if gnice_flg == 1:
                            tmp_cpu_usage_data[idx][7] += float(f_cpu_usage_src_file_line.split()[10])
                        else:
                            tmp_cpu_usage_data[idx][7] = 0
                        # %steal
                        tmp_cpu_usage_data[idx][8] += float(f_cpu_usage_src_file_line.split()[6])

        # 合計値から平均値に変換 (all)
        for i in range(len(CPU_USAGE_ITEMS)):
            all_cpu_usage_data[i] = all_cpu_usage_data[i] / CPU_USAGE_SAMPLE_NUM

        # 合計値から平均値に変換 (all 以外)
        for i in range(cpu_num):
            for j in range(len(CPU_USAGE_ITEMS)):
                tmp_cpu_usage_data[i][j] = tmp_cpu_usage_data[i][j] / CPU_USAGE_SAMPLE_NUM

            each_cup_usage_data.append(tmp_cpu_usage_data[i])

        # TMP ファイルを削除する
        if not VERBOSE: os.remove(src_tmp_filename)
   
""" create_netperf_result_file """
def create_netperf_result_file(test_case_lists, netperf_data, result_dir_path):
    result = {};

    # TCP_STREAM
    tcp_stream_result = {}
    for i,test_case_list in enumerate(test_case_lists):
        tcp_stream_result[test_case_name_to_version(i)] = netperf_data[NETPERF_TCP_STREAM_TESTS_OFFSET][i]

    tcp_stream_result['ratio'] = calc_ratio(tcp_stream_result)
    result['Stream Throughput'] = {}
    result['Stream Throughput']['TCP_STREAM'] = tcp_stream_result

    # UDP_STREAM_SENDER
    udp_sender_result = {}
    for i in range(len(UDP_STREAM_TESTS)):
        udp_sender_result[UDP_STREAM_TESTS[i]] = {}

        for j,test_case_list in enumerate(test_case_lists):
            udp_sender_result[UDP_STREAM_TESTS[i]][test_case_name_to_version(j)] = netperf_data[NETPERF_UDP_STREAM_TESTS_OFFSET + i][j]
        udp_sender_result[UDP_STREAM_TESTS[i]]['ratio'] = calc_ratio(udp_sender_result[UDP_STREAM_TESTS[i]])
    result['Sender Throughput'] = udp_sender_result

    # UDP_STREAM_RECEIVER
    udp_receiver_result = {}
    for i in range(len(UDP_STREAM_TESTS)):
        udp_receiver_result[UDP_STREAM_TESTS[i]] = {}

        for j,test_case_list in enumerate(test_case_lists):
             udp_receiver_result[UDP_STREAM_TESTS[i]][test_case_name_to_version(j)] = netperf_data[NETPERF_UDP_STREAM_TESTS_OFFSET + len(UDP_STREAM_TESTS) + i][j]
        udp_receiver_result[UDP_STREAM_TESTS[i]]['ratio'] = calc_ratio(udp_receiver_result[UDP_STREAM_TESTS[i]])
    result['Receiver Throughput'] = udp_receiver_result

    # TCP/UDP_RR
    tcp_rr_result = {}
    udp_rr_result = {}
    result['RR Throughput'] = {}
    for i,test_case_list in enumerate(test_case_lists):
        tcp_rr_result[test_case_name_to_version(i)] = netperf_data[NETPERF_TCP_RR_TESTS_OFFSET][i]
    tcp_rr_result['ratio'] = calc_ratio(tcp_rr_result)
    result['RR Throughput']['TCP_RR'] = tcp_rr_result

    for i,test_case_list in enumerate(test_case_lists):
        udp_rr_result[test_case_name_to_version(i)] = netperf_data[NETPERF_UDP_RR_TESTS_OFFSET][i]
    udp_rr_result['ratio'] = calc_ratio(udp_rr_result)
    result['RR Throughput']['UDP_RR'] = udp_rr_result

    return result

""" create_cpu_usage_result_file """
def create_cpu_usage_result_file(test_case_lists, cpu_usage_data, result_dir_path, get_resources_dirtype, is_all):
    steal_flg = 0
    if steal_flg == 0:
        target_num = len(CPU_USAGE_ITEMS) - 1
    else:
        target_num = len(CPU_USAGE_ITEMS)

    result = {}
    result['Stream CPU Usage'] = {}
 
    tcp_stream_list = {}
    # TCP_STREAM
    for i,test_case_list in enumerate(test_case_lists):
        tcp_stream_items = {}
        for j in range(target_num):
            tcp_stream_items[CPU_USAGE_ITEMS[j]] = cpu_usage_data[CPU_USAGE_TCP_STREAM_TESTS_OFFSET][i][j]
        key = test_case_name_to_version(i) if is_all else test_case_list
        tcp_stream_list[key] = tcp_stream_items

    result['Stream CPU Usage']['TCP_STREAM'] = tcp_stream_list

    udp_stream_list = {}
    # UDP_STREAM
    for i in range(len(UDP_STREAM_TESTS)):
        for j,test_case_list in enumerate(test_case_lists):
            udp_stream_items = {}
            for k in range(target_num):
                udp_stream_items[CPU_USAGE_ITEMS[k]] = cpu_usage_data[CPU_USAGE_UDP_STREAM_TESTS_OFFSET + i][j][k]
            key = test_case_name_to_version(j) if is_all else test_case_list
            udp_stream_list[key] = udp_stream_items
            result['Stream CPU Usage'][UDP_STREAM_TESTS[i]] = udp_stream_list

    # TCP/UDP_RR
    tcp_rr_list = {}
    udp_rr_list = {}
    result['RR CPU Usage'] = {}
    for i,test_case_list in enumerate(test_case_lists):
        tcp_rr_items = {}
        for j in range(target_num):
            tcp_rr_items[CPU_USAGE_ITEMS[j]] = cpu_usage_data[CPU_USAGE_TCP_RR_TESTS_OFFSET][i][j]
        key = test_case_name_to_version(i) if is_all else test_case_list
        tcp_rr_list[key] = tcp_rr_items

        result['RR CPU Usage']['TCP_RR'] = tcp_rr_list

        udp_rr_items = {}
        for j in range(target_num):
            udp_rr_items[CPU_USAGE_ITEMS[j]] = cpu_usage_data[CPU_USAGE_UDP_RR_TESTS_OFFSET][i][j]
        udp_rr_list[key] = udp_rr_items

        result['RR CPU Usage']['UDP_RR'] = udp_rr_list

    return result

""" proc_netperf_result """
def proc_netperf_result(test_case_lists, result_dir_path):

    RLT_PARSER_DIC = {
        "TCP_STREAM":get_tcp_stream,
        "UDP_STREAM_SENDER":get_udp_stream_sender,
        "UDP_STREAM_RECEIVER":get_udp_stream_receiver,
        "TCP_RR":get_tcp_rr,
        "UDP_RR":get_udp_rr,
    }
    
    # gnuplot 用のデータを初期化
    # gnuplot_netperf_data [NETPERF_TEST_INDEX][test_case_list.txt で指定した <TESTCASE> の数]
    gnuplot_netperf_data = [[0 for i in range(len(test_case_lists))] for j in range(NETPERF_TEST_INDEX)]

    # 指定ディレクトリリスト数分繰り返し (./ 配下の test_case_list.txt で指定した <TESTCASE> ディレクトリ数)
    for i in range(len(test_case_lists)):
        if VERBOSE: print "★★★★ %s の処理" % test_case_lists[i]

        # test_case_lists[i] 配下のディレクトリのリスト (super_netperf2 の試行回数分のディレクトリのリスト)
        dir_lists = []
        for dir_list in getdirs(test_case_lists[i]):
            dir_lists.append(dir_list)

        if VERBOSE: print "★★★★", dir_lists, "のデータを集計"

        # 試験回数
        testcount_netperf = 0

        # super_netperf2 の試行回数分繰り返し (./<TESTCASE>/ 配下の P2P_yymmdd-hhmm 数)
        for j in range(len(dir_lists)):
            if VERBOSE: print "★★★★★ %s の処理" % dir_lists[j]

            # サブディレクトリが空では無い場合
            if NETPERF_RESULT_DIR:
                netperf_result_dir_path = './' + test_case_lists[i] + '/' + dir_lists[j] + '/' + NETPERF_RESULT_DIR
            # サブディレクトリが空の場合
            else:
                netperf_result_dir_path = './' + test_case_lists[i] + '/' + dir_lists[j]

            if VERBOSE: print "★★★★★ *.rlt ディレクトリ: %s 配下" % netperf_result_dir_path

            # j 番目の試験結果のディレクトリ配下の *.rlt をリスト化
            rlt_lists = glob.glob(netperf_result_dir_path + '/*.rlt')

            # j 番目の試験結果のディレクトリ配下に試験ファイル (*.rlt) が無ければ、処理スキップ
            if len(rlt_lists)==0:
                sys.stderr.write("★★★★★" + netperf_result_dir_path + "配下に試験ファイル rlt がありません。\n")
                continue

            testcount_netperf += 1

            # 対象の試験ファイル数分繰り返し (./<TESTCASE>/P2P_yymmdd-hhmm 配下の rlt ファイル数)
            for rlt_list in rlt_lists:
                # tarbz2_list からファイル名のみ抽出する
                rlt_elems = os.path.basename(rlt_list)

                if VERBOSE: print "★★★★★★ %s を集計" % rlt_elems

                # ファイル名を'_'もしくは'.'で分割
                rlt_elems = re.split('[_.]', rlt_elems)

                # test_type を生成
                test_type = rlt_elems[2] + '_' + rlt_elems[3]
                rlt_idx = NETPERF_TEST_OFFSET_DIC[test_type]

                # UDP_STREAM_xx の場合
                # (SENDER,RECEIVER の 2 パターンを取得)
                if len(rlt_elems) > 7:
                    bufsize = rlt_elems[7]

                    # SENDER
                    rlt_idx += UDP_STREAM_BUFSIZE_DIC[bufsize]

                    parser = RLT_PARSER_DIC[test_type + '_SENDER']
                    gnuplot_netperf_data[rlt_idx][i] += parser(rlt_list)

                    # RECEIVER
                    rlt_idx += len(UDP_STREAM_TESTS)

                    parser = RLT_PARSER_DIC[test_type + '_RECEIVER']
                    gnuplot_netperf_data[rlt_idx][i] += parser(rlt_list)

                else:
                    parser = RLT_PARSER_DIC[test_type]
                    gnuplot_netperf_data[rlt_idx][i] += parser(rlt_list)

            # 対象の試験ファイル数分繰り返し ここまで
        # super_netperf2 の試行回数分繰り返し ここまで

        # 合計値から平均値に変換
        if testcount_netperf == 0:
            sys.stderr.write("★★★★集計対象となるデータがありませんでした。(%d)\n" \
                             % testcount_netperf)
        else:
            for k in range(NETPERF_TEST_INDEX):
                gnuplot_netperf_data[k][i] = round(gnuplot_netperf_data[k][i] / testcount_netperf , NDIGITS)
                
    # 指定ディレクトリリスト数分繰り返し ここまで
    # (./ 配下の test_case_list.txt で指定した <TESTCASE> ディレクトリ数)

    # gnuplot (netperf) 用のデータ生成
    return create_netperf_result_file(test_case_lists, gnuplot_netperf_data, result_dir_path)

""" proc_cpu_usage_result """
def proc_cpu_usage_result(test_case_lists, result_dir_path, get_resources_dirtype):
    # gnuplot 用のデータを初期化
    # gnuplot_cpu_usage_data [CPU_USAGE_TEST_INDEX]
    #                        [test_case_list.txt で指定した <TESTCASE> の数]
    #                        [CPU_USAGE_ITEMS]
    gnuplot_cpu_usage_data = [[[0 for i in range(len(CPU_USAGE_ITEMS))] \
                               for j in range(len(test_case_lists))] \
                              for k in range(CPU_USAGE_TEST_INDEX)]

    # グラフ出力フラグ
    gnuplot_flg = 0

    result = {'each': {}, 'all': {}}

    # 指定ディレクトリリスト数分繰り返し
    # (./ 配下の test_case_list.txt で指定した <TESTCASE> ディレクトリ数)
    for i in range(len(test_case_lists)):

        # <TESTCASE> 毎に出力する各 CPU の使用率を格納するリスト
        # <TESTCASE> 毎に CPU 数が変わる可能性もあるので、ここで初期化
        # 最終的には下の構成になる
        # each_cpu_data [CPU_USAGE_TEST_INDEX]
        #               [CPU 数]
        #               [CPU_USAGE_ITMES]
        each_cpu_data = [[] for j in range(CPU_USAGE_TEST_INDEX)]
        
        if VERBOSE: print "★☆☆ %s の処理" % test_case_lists[i]

        # test_case_lists[i] 配下のディレクトリのリスト
        # (super_netperf2 の試行回数分のディレクトリのリスト)
        dir_lists = []
        for dir_list in getdirs(test_case_lists[i]):
            dir_lists.append(dir_list)

        if VERBOSE: print "★☆☆", dir_lists, "のデータを集計"

        # 試験回数
        testcount_cpu_usage = 0

        # super_netperf2 の試行回数分繰り返し (./<TESTCASE>/ 配下の P2P_yymmdd-hhmm 数)
        for j in range(len(dir_lists)):

            # サブディレクトリが空では無い場合
            if get_resources_dirtype:
                get_resources_result_dir = './' + test_case_lists[i] + '/' \
                                           + dir_lists[j] + '/' \
                                           + get_resources_dirtype + GET_RESOURCES_DIR
            # サブディレクトリが空の場合
            else:
                get_resources_result_dir = './' + test_case_lists[i] + '/' \
                                           + dir_lists[j]

            # 指定ディレクトリが存在しない場合は該当の試行回数の処理をスキップする
            if os.path.isdir(get_resources_result_dir) == 0:
                sys.stderr.write("★☆☆☆" + get_resources_result_dir + "がありません。\n")
                break

            if VERBOSE: print "★☆☆☆ %s の処理 (試行 %d 回目のデータ)" % (get_resources_result_dir,testcount_cpu_usage)

            # j 番目の試験結果のディレクトリ配下の *.tar.bz2 をリスト化
            # 対象ファイル：{ホスト名}_netperf_*_resrc_{yyyymmdd}-{hhmmss}
            tarbz2_lists = glob.glob(get_resources_result_dir + '/*netperf*resrc*.tar.bz2')
            # j 番目の試験結果のディレクトリ配下に *.tar.bz2 が無ければ、処理スキップ
            if len(tarbz2_lists) == 0:
                sys.stderr.write("★☆☆☆" + get_resources_result_dir + "配下に *.tar.bz2 がありません。\n")
                continue

            if CPU_USAGE_TEST_INDEX < len(tarbz2_lists):
                sys.stderr.write("★☆☆☆ 対象試験項目の tar.bz2 が複数ある可能性があります。(%s) \n" % tarbz2_lists)
                sys.exit()
            
            testcount_cpu_usage += 1

            # 対象の試験ファイル数分繰り返し (./<TESTCASE>/P2P_yymmdd-hhmm/get_resources_result_dir 配下の tar.bz2 ファイル数)
            # 試験項目分の tar.bz2 があるはず
            for tarbz2_list in tarbz2_lists:
                
                # tarbz2_list からファイル名のみ抽出する
                tarbz2_elems = os.path.basename(tarbz2_list)

                if VERBOSE: print "★☆☆☆ %s を分析" % tarbz2_elems

                # ファイル名を'_'もしくは'.'で分割
                tarbz2_elems = re.split('[_]', tarbz2_elems)

                # test_type を生成
                test_type = tarbz2_elems[3] + '_' + tarbz2_elems[4]
                tarbz2_idx = CPU_USAGE_TEST_OFFSET_DIC[test_type]

                # CPU 使用率 (TMP) のファイル名に使用する測定項目名
                cpu_usage_filename = get_resources_dirtype + '_' + test_type

                # UDP_STREAM_xx の場合
                if len(tarbz2_elems) >= 11:
                    bufsize = tarbz2_elems[8]
                    tarbz2_idx += UDP_STREAM_BUFSIZE_DIC[bufsize]

                    # CPU 使用率 (TMP) のファイル名に使用する測定項目名
                    cpu_usage_filename = cpu_usage_filename + '_' + bufsize

                # CPU 使用率 (TMP) のファイル名に使用する測定項目名
                cpu_usage_filename = cpu_usage_filename + '_' + test_case_lists[i] + '_' + dir_lists[j]

                # tar.bz2 内の sar ファイルから CPU 使用率を取得
                tmp_all_cpu_data = [0 for k in range(len(CPU_USAGE_ITEMS))]
                tmp_each_cpu_data = []

                get_cpu_usage_data(tarbz2_list, tmp_all_cpu_data, tmp_each_cpu_data, result_dir_path, cpu_usage_filename)

                # super_netperf2 の試行回数分加算していく
                # CPU 使用率の集計対象項目分ループ
                for k in range(len(CPU_USAGE_ITEMS)):
                    gnuplot_cpu_usage_data[tarbz2_idx][i][k] += tmp_all_cpu_data[k]

                # super_netperf2 の 1 回目の試行の場合は tar.bz2 内から取得したリストを追加
                if testcount_cpu_usage == 1:
                    each_cpu_data[tarbz2_idx] = each_cpu_data[tarbz2_idx] + tmp_each_cpu_data

                # それ以外の場合は tar.bz2 内から取得したリストを試行回数分加算していく
                else:
                    # super_netperf2 の試行回数毎の CPU 数が異なる場合、リストの参照がおかしくなるので以降の処理をスキップ
                    if len(tmp_each_cpu_data) != len(each_cpu_data[tarbz2_idx]):
                        if INFO: 
                            print "tmp_each_cpu_data:"
                            pprint.pprint(tmp_each_cpu_data)
                            print "each_cpu_data:"
                            pprint.pprint(each_cpu_data)
                            print "each_cpu_data [ %d ] :" % tarbz2_idx
                            pprint.pprint(each_cpu_data[tarbz2_idx])
                        sys.stderr.write("★☆☆☆ super_netperf2 の試行回数毎の CPU 数が異なるようです。(%d,%d)\n" \
                                         % (len(tmp_each_cpu_data),len(each_cpu_data[tarbz2_idx])))
                        sys.stderr.write("★☆☆☆ %s の処理をスキップします。\n" % get_resources_dirtype)
                        return

                    # CPU 数分ループ
                    for k in range(len(tmp_each_cpu_data)):
                        # CPU 使用率の集計対象項目分ループ
                        for l in range(len(CPU_USAGE_ITEMS)):
                            each_cpu_data[tarbz2_idx][k][l] += tmp_each_cpu_data[k][l]

            # 対象の試験ファイル数分繰り返し ここまで
        # super_netperf2 の試行回数分繰り返し ここまで

        # 合計値から平均値に変換
        if testcount_cpu_usage == 0:
            sys.stderr.write("★☆☆集計対象となるデータがありませんでした。(%d)\n" % testcount_cpu_usage)

        else:
            # 集計対象が一度でもあればフラグ立てる
            gnuplot_flg = 1

            # CPU 使用率の all
            for k in range(CPU_USAGE_TEST_INDEX):
                for l in range(len(CPU_USAGE_ITEMS)):
                    gnuplot_cpu_usage_data[k][i][l] = round(gnuplot_cpu_usage_data[k][i][l] / testcount_cpu_usage ,\
                                                            NDIGITS)

            # CPU 使用率の all 以外
            for k in range(CPU_USAGE_TEST_INDEX):
                for l in range(len(tmp_each_cpu_data)):
                    for m in range(len(CPU_USAGE_ITEMS)):
                        each_cpu_data[k][l][m] = round(each_cpu_data[k][l][m] / testcount_cpu_usage , \
                                                       NDIGITS)

            # 集計対象があった場合のみ該当テストケースのCPU使用率 (each) を出力

            # test_case_list の代わりに CPU リストを作成
            cpu_name_list = []
            for j in range(len(tmp_each_cpu_data)):
                cpu_name_list.append("cpu"+str(j))

            # 各 CPU 使用率の出力ディレクトリ
            each_cpu_usage_result_path = result_dir_path + \
                                         EACH_CPU_USAGE_RESULT_DIR + '/' + test_case_lists[i] + '/'

            # 出力ディレクトリが無い場合は生成
            if os.path.isdir(each_cpu_usage_result_path) == 0: os.makedirs(each_cpu_usage_result_path)

            # gnuplot (各 CPU の cpu_usage) 用のデータ生成
            result['each'][test_case_name_to_version(i)] = create_cpu_usage_result_file(cpu_name_list, each_cpu_data, \
                                                                      each_cpu_usage_result_path, get_resources_dirtype, False)

    # 指定ディレクトリリスト数分繰り返し ここまで (./ 配下の test_case_list.txtで指定した<TESTCASE>ディレクトリ数)

    if gnuplot_flg != 0:
        # gnuplot (cpu_usage) 用のデータ生成
        result['all'] = create_cpu_usage_result_file(test_case_lists, gnuplot_cpu_usage_data, \
                                                                        result_dir_path, get_resources_dirtype, True)

    # result['each'] = format_each_cpu_usage_result(result['each'])
    return result

def format_each_cpu_usage_result(result):
    formatted_result = {}
    test_cases = result.keys();

    for test_case in test_cases:
        items = result[test_case]
        for key in items.keys():
            if key not in formatted_result:
                formatted_result[key] = {}

            formatted_result[key][test_case] = result[test_case][key]

    return formatted_result

""" main """
def main():

    if INFO: print "★ netperf_tool.py の処理を開始します"
    results = {}
    result_items = {}

    # TEST_CASE_LIST_DIR 配下の比較パターンとなるディレクトリのリスト (./{TEST_CASE_LIST_DIR}/ 配下のディレクトリ)
    test_case_list_dir_lists = []

    # TEST_CASE_LIST_DIR のパス
    test_case_list_dir_path = './' + TEST_CASE_LIST_DIR
        
    for test_case_list_dir_list in getdirs(test_case_list_dir_path):
        test_case_list_dir_lists.append(test_case_list_dir_list)

    if VERBOSE: print "★",test_case_list_dir_lists,"のディレクトリを検出"
    
    # test_case_list_dir_lists 分繰り返し (./{TEST_CASE_LIST_DIR}/ 配下の比較パターンディレクトリ数)
    for i in range(len(test_case_list_dir_lists)):
            results[test_case_list_dir_lists[i]] = {}

            if INFO: print "★★ %s の処理を開始" % test_case_list_dir_lists[i]

            # TEST_CASE_LIST 内に記載された試験項目に対応するディレクトリのリスト 
            test_case_lists = []

            # 集計結果(*.dat)、グラフ(*.png)の格納パス (test_case_list_dir_list 配下)
            result_dir_path = './' + TEST_CASE_LIST_DIR + '/' + test_case_list_dir_lists[i] + '/'

            # TEST_CASE_LIST 内に記載された試験項目を読み込んで test_case_lists に格納
            with open('./' + TEST_CASE_LIST_DIR + '/' \
                      + test_case_list_dir_lists[i] + '/' \
                      + TEST_CASE_LIST, "r") as f_test_case_list_txt:
                for f_test_case_list_txt_line in f_test_case_list_txt:
                    # コメント文は読み飛ばす
                    if f_test_case_list_txt_line.startswith('#'):
                        continue
                    # 空行も読み飛ばす
                    elif f_test_case_list_txt_line.startswith('\n'):
                        continue

                    # rstrip で改行コードを削除し、
                    # test_case_lists に f_test_case_list_txt_line を追加
                    test_case_lists.append(f_test_case_list_txt_line.rstrip())

            if VERBOSE: print "★★", test_case_lists, "を比較"
            if len(test_case_lists) != 2:
                sys.stderr.write("比較対象の数が誤っています。\n")

            ### netperf 結果の処理部
            ### (NETPERF_TOOL_MODE が 2:cpu 以外)
            ###
            if NETPERF_TOOL_MODE != 2:

                if VERBOSE: print "★★ netperf"

                # netperf_result メイン処理呼び出し
                results[test_case_list_dir_lists[i]]['netperf'] = proc_netperf_result(test_case_lists, result_dir_path)

            ### CPU 使用率の処理部
            ### (NETPERF_TOOL_MODE が 1:netperf 以外)
            ###
            if NETPERF_TOOL_MODE != 1:
                
                if VERBOSE: print "★☆ cpu usage"

                # cpu_usage メイン処理呼び出し (SENDER/RECEIVER/SENDER_HYPERVISOR/RECEIVER_HYPERVISOR)
                for j in range(len(CPU_USAGE_TEST_PATTERN)):
                    result = proc_cpu_usage_result(test_case_lists, result_dir_path, CPU_USAGE_TEST_PATTERN[j])
                    if result is not None:
                        result_items[CPU_USAGE_TEST_PATTERN[j]] = result

            results[test_case_list_dir_lists[i]]['cpu_usage'] = result_items;
            result_items = {}

            if INFO: print "★★ %s の処理を終了" % test_case_list_dir_lists[i]

    print(json.dumps(results))
    if INFO: print "★ netperf_tool.py の処理を終了します"

if __name__ == '__main__':
    main()
