const fs = require("fs");
const path = require("path");




/**
 * read dir recursive sync
 * @param baseDir
 * @returns {Array}
 */
const readDirTreeSync = function (baseDir) {
    baseDir = path.resolve(baseDir);
    const result = fs.readdirSync(baseDir);
    let allPaths = [];
    for (let i = 0; i < result.length; i++) {
        const filePath = path.join(baseDir, result[i]);
        const state = fs.lstatSync(filePath);
        if (state.isDirectory()) {
            allPaths = allPaths.concat(readDirTreeSync(filePath));
        } else {
            allPaths.push(filePath);
        }
    }
    return allPaths;
};

/**
 * read dir recursive async
 * @param baseDir
 * @param callback
 */
const readDirTree = function (baseDir, callback) {
    baseDir = path.resolve(baseDir);
    let allPaths = [];
    fs.readdir(baseDir, function (err, result) {
        if (err || result.length <= 0) {
            return callback(err, allPaths);
        }
        let finished = [];
        const checkIsFinish = function (finishedPath) {
            finished.push(finishedPath);
            if (finished.length === result.length) {
                if (typeof callback === "function") {
                    if (hasError) {
                        callback(hasError, allPaths);
                    } else {
                        callback(null, allPaths);
                    }
                } else {
                    console.warn("no callback passed");
                }
            }
        };
        let hasError = null;
        for (let i = 0; i < result.length; i++) {
            const filePath = path.join(baseDir, result[i]);
            fs.lstat(filePath, function (err, state) {
                if (state && state.isDirectory()) {
                    readDirTree(filePath, function (err, result) {
                        if (err) {
                            hasError = err;
                        } else {
                            allPaths = allPaths.concat(result);
                        }
                        checkIsFinish(filePath);
                    });
                } else {
                    allPaths.push(filePath);
                    checkIsFinish(filePath);
                }
            });
        }
    });
};

/**
 * read dir recursive async using promises
 */
const readDirTreeP = function () {
};

//
// console.time("async");
// readDirTree("../../../", function (err, result) {
//     console.log("files number", result.length);
//     console.timeEnd("async");
// });

// console.time("sync");
// const result = readDirTreeSync("../../../");
// console.log("files number", result.length);
// console.timeEnd("sync");



