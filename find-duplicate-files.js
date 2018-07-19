#!/usr/bin/env node

/* eslint space-before-function-paren: off */

const fs = require('fs');
const path = require('path');
const args = require('args');
const childProcess = require('child_process');
const os = require('os');

const CHUNK_SIZE = 1024;
const DEFAULT_QUICK_SIZE_LIMIT = 65536; // 64 KB

args
  .option('dir', 'Directory path to scan for duplicate')
  .option(['', 'sizemax'], 'Maximum file size to check in KB')
  .option(['', 'sizemin'], 'Minimum file size to check in KB')
  .option('ext', 'Extensions to check')
  .option(['', 'exclude-ext'], 'Exclude extensions')
  .option(['', 'exclude'], 'Exclude')
  .option(['', 'depth'], 'Maximum deep compare chunk size in KB')
  .example('find-duplicate-files --dir /test/', 'Find duplicate files in specific directory')
  .example('find-duplicate-files --dir /test/ --exclude node_modules,bin', 'Exclude folders to scan')
  .example('find-duplicate-files --dir /test/ --sizemax 64 --sizemin 1 --ext .txt,.html --depth 1 --exclude node_modules', 'Advance scan')
  ;

const options = getOptions(args.parse(process.argv));

if (!options) {
  process.exit();
}

const { dir, sizemax, sizemin, ext, excludeExt, depth, exclude } = options;

if (!fs.existsSync(dir)) {
  console.log('Directory not found');
  process.exit();
}

if (!fs.lstatSync(dir).isDirectory()) {
  console.log('Given path is not directory');
  process.exit();
}

console.log('Preparing files...');
const files = getFiles(dir);

if (files.length === 0) {
  console.log('No matching files found in directory');
  process.exit();
}

const { duplicateFileCount, duplicateFiles } = findDuplicate(files);

if (!duplicateFileCount) {
  console.log('No duplicate file found');
  process.exit();
}

console.log(`${duplicateFileCount} files detect as duplicate`);

console.log('Creating report...');
const reportFilePath = createReport(duplicateFiles, duplicateFileCount);
console.log('Report created');

childProcess.execSync(reportFilePath);

// /////////////////////////////////////////////////////
// Helper functions
// /////////////////////////////////////////////////////

/**
 * Extract all options
 * @param {Object} options Command arguments
 */
function getOptions(options) {
  const dir = options.dir;
  let sizemax = options.sizemax;
  let sizemin = options.sizemin;
  const ext = (options.ext || '').split(',').filter(e => !!e);
  const excludeExt = (options.excludeExt || '').split(',').filter(e => !!e);
  /**
   * @type {string[]}
   */
  const exclude = (options.exclude || '').split(',').filter(e => !!e);
  let depth = options.depth;

  if (sizemax && typeof sizemax !== 'number') {
    console.log('Invalid argument --sizemax');
    return;
  }

  if (sizemin && typeof sizemin !== 'number') {
    console.log('Invalid argument --sizemin');
    return;
  }

  if (depth && typeof depth !== 'number') {
    console.log('Invalid argument --depth');
    return;
  }

  if (sizemax) {
    sizemax *= 1024;
  }

  if (sizemin) {
    sizemin *= 1024;
  }

  if (depth) {
    depth *= 1024;
  }

  if (!dir) {
    args.showHelp();
  }

  return { dir, sizemax, sizemin, ext, excludeExt, depth, exclude };
}

/**
 * Find all duplicate files
 * @param {any[]} files Files to check duplicate
 * @param {number} depth Depth of compare buffer for duplicate
 * @returns {{duplicateFileCount: number, duplicateFiles: any[]}}
 */
function findDuplicate(files) {
  const duplicateFiles = [];
  let duplicateFileCount = 0;

  const clearLineAvailable = !!process.stdout.clearLine;

  let lastChecked = Date.now() - 1000;
  const replaceLine = (str) => {
    if ((Date.now() - lastChecked) < 1000) {
      return;
    }

    lastChecked = Date.now();
    clearLineAvailable && process.stdout.clearLine();
    clearLineAvailable && process.stdout.cursorTo(0);
    clearLineAvailable && process.stdout.write(str);
  };

  const clearLine = () => {
    clearLineAvailable && process.stdout.clearLine();
    clearLineAvailable && process.stdout.cursorTo(0);
  };

  console.time('Duplicate search time');
  console.log(`${files.length} files indexed to check duplicate`);
  let groups = {};
  let key;
  for (let i = 0; i < files.length; i++) {
    key = `${files[i].ext}_${files[i].size}`;
    if (!groups[key]) {
      groups[key] = {
        files: []
      };
    }

    groups[key].files.push(files[i]);
  }

  groups = Object.keys(groups)
    .map(key => ({ key: key, files: groups[key].files }))
    .filter(item => item.files.length > 1);

  console.log(`${groups.length} groups indexed to check duplicate`);

  let quickSizeLimit = depth || DEFAULT_QUICK_SIZE_LIMIT;

  let dObj;
  let _isDuplicate = false;
  for (let k = 0; k < groups.length; k++) {
    replaceLine(`${k}/${groups.length} groups checking for duplicate...`);
    for (let i = 0; i < groups[k].files.length - 1; i++) {
      // replaceLine(`${++completedCount}/${totalCount} files checking for duplicate...`);
      if (groups[k].files[i].duplicate) {
        continue;
      }

      dObj = undefined;

      for (let j = i + 1; j < groups[k].files.length; j++) {
        if (groups[k].files[j].duplicate) {
          continue;
        }

        _isDuplicate = isDuplicateFile(groups[k].files[i], groups[k].files[j], true, quickSizeLimit);

        if (_isDuplicate) {
          if (!dObj) {
            dObj = {
              name: path.basename(groups[k].files[i].path),
              size: groups[k].files[i].size,
              files: [groups[k].files[i].path]
            };

            groups[k].files[i].duplicate = true;
            duplicateFileCount++;
            duplicateFiles.push(dObj);
          }

          groups[k].files[j].duplicate = true;
          duplicateFileCount++;
          dObj.files.push(groups[k].files[j].path);
        }
      }
    }
  }

  clearLine();
  console.log('Duplicate finding process done');

  console.timeEnd('Duplicate search time');

  return {
    duplicateFileCount,
    duplicateFiles
  };
}

/**
 * Check for duplicate file
 * @param {String} file1 First file path
 * @param {String} file2 Second file path
 * @returns {Boolean}
 */
function isDuplicateFile(file1, file2, isQuick, quickSizeLimit) {
  if (file1.size !== file2.size) {
    return false;
  }

  if (file1.ext !== file2.ext) {
    return false;
  }

  let _isDuplicate = true;

  let index = 0;
  const buffer1 = Buffer.alloc(CHUNK_SIZE);
  const buffer2 = Buffer.alloc(CHUNK_SIZE);
  const fd1 = fs.openSync(file1.path, 'r');
  const fd2 = fs.openSync(file2.path, 'r');
  while (index < file1.size) {
    fs.readSync(fd1, buffer1, 0, CHUNK_SIZE, index);
    fs.readSync(fd2, buffer2, 0, CHUNK_SIZE, index);
    index += CHUNK_SIZE;

    if (Buffer.compare(buffer1, buffer2) !== 0) {
      _isDuplicate = false;
      break;
    }

    if (isQuick && index >= quickSizeLimit) {
      break;
    }
  }

  fs.closeSync(fd1);
  fs.closeSync(fd2);

  return _isDuplicate;
};

/**
 * Scan directory for all files
 *
 * @param {string} dir Directory to scan
 * @param {number} sizemax Max size limit to scan file
 * @param {number} sizemin Min size limit to scan file
 * @param {string[]} ext Extension to include file
 * @param {string[]} excludeExt Extension to exclude file
 */
function getFiles(dir) {
  const files = [];
  const dFiles = fs.readdirSync(dir);
  let stat;
  for (let i = 0; i < dFiles.length; i++) {
    try {
      if (exclude.length && exclude.indexOf(dFiles[i]) !== -1) {
        continue;
      }

      dFiles[i] = path.join(dir, dFiles[i]);
      stat = fs.lstatSync(dFiles[i]);
      if (stat.isFile()) {
        if (sizemin && stat.size < sizemin) {
          continue;
        }

        if (sizemax && stat.sizemax > sizemax) {
          continue;
        }

        if (ext.length && ext.indexOf(path.extname(dFiles[i]).toLowerCase()) === -1) {
          continue;
        }

        if (excludeExt.length && excludeExt.indexOf(path.extname(dFiles[i]).toLowerCase()) !== -1) {
          continue;
        }

        files.push({
          path: dFiles[i],
          size: stat.size,
          ext: path.extname(dFiles[i]).toLocaleLowerCase()
        });
      } else if (stat.isDirectory()) {
        Array.prototype.push.apply(files, getFiles(dFiles[i]));
      }
    } catch (error) {
      // Not able to read directory or file
      // Could be permission issue
    }
  }

  return files;
}

/**
 * Get file size string in formatted
 * @param {number} size Size in bytes
 * @returns {string}
 */
function getSizeString(size) {
  var units = ['Bytes', 'KB', 'MB', 'GB'];

  let index = 0;
  while (size > 1024 && index < units.length) {
    size /= 1024;
    index++;
  }

  return Number(size).toFixed(index > 1 ? 2 : 0) + ' ' + units[index];
}

/**
 * Create report for duplicate files
 * @param {any[]} data Data for generate report
 * @returns {string} Generate file name
 */
function createReport(data) {
  const filepath = path.join(os.tmpdir() + '/duplicate-file-report.html');
  const html = `
  <!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">

<head>
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css">

  <style>
    html,
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
      font-size: 12px;
    }

    table {
      font-weight: 500;
    }
  </style>
</head>

<body>
  <div class="container">
    <h4>Duplicate file statics (${duplicateFileCount})</h4>
    <table class="table table-bordered table-sm">
      <thead>
        <tr>
          <th style="width: 100px">&nbsp;</th>
          <th>File</th>
          <th style="width: 150px">Size</th>
        </tr>
      </thead>
      <tbody>
        ${
    data.map(g => {
      return `<tr>
              <td colspan="2">${g.name}</td>
              <td>${getSizeString(g.size)}</td>
              </tr>
        ${
        g.files.map(f => {
          return `<tr><td></td><td>${f}</td><td></td></tr>`;
        }).join('')
        }`;
    }).join('')
    }
      </tbody>
    </table>
  </div>
</body>

</html>
`;

  fs.writeFileSync(filepath, html);
  return filepath;
}
