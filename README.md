# Verification Report Generator

## About
This tool allows you to generate verification report in HTML format.

## Requirements
- node: latest version (current v5.7.0)
- npm: latest version (current 3.8.0)

## SetUp

### Clone Repository

```
git clone https://github.com/ysm001/verification-report-generator.git
cd verification-report-generator
```

### Install Dependencies

```
npm install
```

## Run

```
node bin/generate-report.js <input-directory> <output-directory>
```

## Configure
config/ directory contains some configure files.

### Directory (config/directory.json)

```
{
  "tmp": "tmp"
}
```
