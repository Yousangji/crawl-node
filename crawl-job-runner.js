const Promise = require("bluebird");
const union = require("lodash.union");
const fs = require("fs");
const {crawlLinks, crawlData} = require("./crawl-data-extractor");
const writeFile = Promise.promisify(fs.writeFile);
const readFile = Promise.promisify(fs.readFile);
const root = __dirname;

//---------database
const mongoose = require('mongoose');
const crawldb = mongoose.createConnection('mongodb://localhost/icocrawl');
const Schema = mongoose.Schema;
const link = new Schema({
    targetUrl: String,
    baseUrl: String,
    created: Date,
    updated: Date,
    duedate: Date,
    trial: Number,
    done: Boolean
});
const data = new Schema({
    teamName: String,
    whitePaperAddr: String,
    tokenInfo: Schema.Types.Mixed,
    icoInfo: Schema.Types.Mixed,
    socialLinks: Schema.Types.Mixed,
    teamMembersInfo: Schema.Types.Mixed,
    targetUrl: String
})
const linkModel = crawldb.model('link', link);
const dataModel = crawldb.model('ico-data', data);


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


/**
 * request with links , crawl and save data as a file one by one
 * @param links
 */
const crawlAllData = links => Promise.each(links, link => crawlData(`https://icobench.com${link}`)
    .then(data => {
        writeFile(`${root}/data${link}.json`, JSON.stringify(data, null, 2));
    }), {concurrency: 1});

crawlAllData().then(() => console.log("done"));


// /**
//  * crawlAllData with links from Json File
//  */
// readFile(root + "/data/links.json", "utf8")
//     .then(result => JSON.parse(result))
//     .then(res => {
//         crawlAllData(res);
//     });



