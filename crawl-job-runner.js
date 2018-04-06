const Promise = require("bluebird");
const union = require("lodash.union");
const fs = require("fs");
const {crawlLinks, crawlData} = require("./crawl-data-extractor");
const writeFile = Promise.promisify(fs.writeFile);
const readFile = Promise.promisify(fs.readFile);
const crawlDataProm = Promise.promisify(crawlData);

const root = __dirname;
//
// crawlURL("https://icobench.com/icos?page=4")
//     .then((result) => {
//         // decide what to do with
//         // 1- the new links (save it in database)
//         // 2- original link (update done, last crawl date)
//         console.log(result);
//     })
//     .catch(error => {
//         console.log(error)
//         // decide what to do with the error and original link (update trial++, error message,done:false)
//     });
//

// crawlLinks("https://icobench.com/icos?page=4", "/ico/")
//     .then(result => console.log(result));

/*
request every chart page and get all links return as a array
 */
const crawlAllLinks = () => {
    const total = 1;
    const counter = [...new Array(total).keys()]; // array from 0 to 254
    return Promise.map(counter, i => crawlLinks(`https://icobench.com/icos?page=${i + 1}`, "/ico/"), {concurrency: 1})
        .then(result => {
            // same as  union.apply(null,result); same as union(result[0],result[1],...)
            return union(...result);
        });
};

//pass links array and write file
// crawlAllLinks()
//     .then(data => writeFile(root + "/data/linksTest.json", JSON.stringify(data, null, 2)))
//     .then(() => console.log("done"));
//


//task 1. get links from file,request with links , crawl and save data as a file one by one
//
const crawlAllData = () => {
    //1. get links from file
    return readFile(root + "/data/links.json", "utf8")
        .then(links => {
            //2. promise crawlData
            return Promise.each(JSON.parse(links), link => {
                return crawlData(`https://icobench.com${link}`)
                    .then(data => {
                        writeFile(`${root}/data${link}.json`, JSON.stringify(data, null, 2));
                    })
            }, {concurrency: 1})
                .then(() => console.log("done"))
        })

};

const upsertLink =



crawlAllData();


