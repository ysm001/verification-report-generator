# Verification Report Generator

## 概要
fio / kernbench / lmbench / netperfのログをグラフ・表を用いたHTML形式に変換するツール

## 必要なもの
- node: 最新版(>= v5.7.0)
- npm
- ruby
- python

## 実行環境構築
```
git clone https://github.com/ysm001/verification-report-generator.git
cd verification-report-generator

npm install
```

## 実行

```
node bin/generate-report.js <input-directory> <output-directory>
```

## Directory構成
```
verification-rpeort-generator/
　├ bin/
　│　└ generate-report.js # HTMLレポート生成スクリプト
　├ config/
　│　└ directory.js       # パス設定
　│　└ style.json         # 生成されるグラフの外観設定 詳細はfusionchartsのページ参照
　│　└ svgo.yml           # SVG画像の圧縮設定 詳細はSVGOのページ参照
　├ templates/          　# 生成するレポート等のテンプレート
　├ libs/             　  # 汎用関数・外部ライブラリ
　├ scripts/            　# ログパーサなどのスクリプト類
　└ src/
```

## 処理内容
主な処理内容は下記の通り

### 1. ディレクトリ構成の整形
Ansibleから吐き出されたログを、パーサで処理し易いディレクトリ構成に再編する
#### 関連ソース
- scripts/formatter.rb (整形スクリプト本体)
- src/log-formatter.js (jsから上記を呼び出すためのwrapper)

### 2. ログ解析
各ログの内容をJSON形式で出力
#### 関連ソース
- scripts/parsers 以下    (パーサ本体)
- src/parser-executer.js (jsから上記を呼び出すためのwrapper)

### 3. ログ解析結果の整形
ログ解析で出力されたJSONを、描画に利用する形式に整形
具体的には、グラフは[Fusioncharts](http://www.fusioncharts.com/)形式に、表はHTMLテーブルに変換しやすい形式に整形
#### 関連ソース
- src/converters 以下

### 4. レンダリング
グラフをSVG形式で、表をHTML形式でレンダリングする
#### 関連ソース
- src/renderers 以下

### 5. レポートの作成
レンダリング結果をテンプレートに埋め込んでHTMLレポートを生成する
#### 関連ソース
- src/report-generator.js
