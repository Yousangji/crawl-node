const Promise = require("bluebird");
const union = require("lodash.union");
const fs = require("fs");
const path = require('path');
const {URL} = require('url');
const download = require('download');
const writeFile = Promise.promisify(fs.writeFile);
const root = __dirname;
const fileType = require('file-type');
const axios = require('axios');
const {crawlLinks, crawlData} = require("./crawl-data-extractor");

//---------database
const mongoose = require('mongoose');
mongoose.connect('mongodb://10.10.122.49:27017/ico-crawler');
const Schema = mongoose.Schema;
const link = new Schema({
    targetUrl: String,
    baseUrl: String,
    duedate: Date,
    trial: {type: Number, default: 0},
    done: {type: Boolean, default: false},
    error: {type: String, default: null}
}, {
    timestamps: true
});
const data = new Schema({
    teamName: String,
    detailInfo: Schema.Types.Mixed,//new has subtitle, subscribe, tag
    whitePaperAddr: String,
    tokenInfo: Schema.Types.Mixed,
    icoInfo: Schema.Types.Mixed,
    socialLinks: Schema.Types.Mixed,
    teamMembersInfo: Schema.Types.Mixed,
    ratings: Schema.Types.Mixed,// new has rated person name,
    milestone:Schema.Types.Mixed,// new has date content
    targetUrl: String,
    whitePaperSave: Schema.Types.Mixed
}, {timestamps: true});
const linkModel = mongoose.model('link', link);
const dataModel = mongoose.model('ico-metadata', data);

/*
request every chart page and get all links return as a array
 */
const crawlAllLinks = () => {
    const total = 228;
    const counter = [...new Array(total).keys()]; // array from 0 to 254
    return Promise.map(counter, i => crawlLinks(`https://icobench.com/icos?page=${i + 1}`, "/ico/"), {concurrency: 1})
        .then(result => {
            // same as  union.apply(null,result); same as union(result[0],result[1],...)
            return union(...result);
        });
};


//pass links array and write db
const saveCrawledLinks = () => crawlAllLinks()
    .then(links => {
        //-------------save link in DB
        Promise.map(links, link => {
            linkModel.findOneAndUpdate({"targetUrl": `https://icobench.com${link}`}, {
                $set: {
                    "targetUrl": `https://icobench.com${link}`,
                    baseUrl: `https://icobench.com`,
                }
            }, {upsert: true, setDefaultsOnInsert: true, new: true}, function (err, doc) {
                if (err) console.log("mongo error : error while upserting new links");
                //console.log(`link : ${link } / db save done `)
            })
        })
    })
    .then(() => {
        console.log("done");
        // mongoose.connection.close()
    });


/**
 * request with links , crawl data, save data in mongo then, if succeed update link done = true if not update link error.log
 * @param links
 */
const crawlAllData = links => Promise.each(links, link => crawlData(link)
    .then(data => {
        //------------------------ save crawled Data
        dataModel.findOneAndUpdate({"targetUrl": link},
            data, {upsert: true})
            .then(() => {
                    //------------------------update link done if saving data succeed
                    linkModel.findOneAndUpdate({"targetUrl": link}, {
                        $set: {"done": true},
                        $inc: {"trial": 1}
                    }, function (err, res) {
                        //console.log(link, "update succeeded link in links db")
                    })
                }
            )

    }).catch(error => {
        console.log(`[error: ${error}]  while crawling data, link : ${link}`);

        //--------------------update link data(trial, updated, error) in db,  if crawling data failed
        linkModel.findOneAndUpdate({"url": link}, {
            $set: {"error": error},
            $inc: {"trial": 1}
        }, function (err, res) {
            if (err) throw console.log(`[error : ${err}] update crawling failed link `);
            console.log(`update crawling failed link result : ${res}`)
        })
    }), {concurrency: 1})
    .then(() => console.log("done"));

//get links undone from database and then crawl all data
const crawlAllDataWithUndoneLinks = () => linkModel
    .find({'done': false})
    .select({"targetUrl": 1, "_id": 0})
    .then(results => results.map(result => result['targetUrl']))
    .then(targetUrls => crawlAllData(targetUrls));


const resolveWhitePaperURL = paperUrl => {
    const myUrl = new URL(paperUrl);
    if (myUrl.host === "drive.google.com") {
        const fileId = myUrl.searchParams && myUrl.searchParams.get("id") ? myUrl.searchParams.get("id") : myUrl.pathname.split('/')[3];
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    if (myUrl.host === "docs.google.com") {
        //todo:google docs download read only file -> download or check if access denied
        const fileId = myUrl.searchParams && myUrl.searchParams.get("id") ? myUrl.searchParams.get("id") : myUrl.pathname.split('/')[3];
        return `https://docs.google.com/document/export?format=pdf&id=${fileId}&includes_info_params=true`;
    }
    return paperUrl;
};

const total = 2735;
let count = 0;

const whitePaperDrop = () => dataModel
    .find({"whitePaperAddr":{$ne:null}})
    .select({
        "whitePaperAddr": true,
        "targetUrl": true,
        "_id": false
    })
    .then(results => Promise.map(results, ({targetUrl, whitePaperAddr}) => {

            const paperUrl = resolveWhitePaperURL(whitePaperAddr);
            const name = targetUrl.substring(targetUrl.lastIndexOf("/") + 1);
            let ext = path.extname(paperUrl);
            count++;
            return download(paperUrl)
                .then(data => {
                    const type = fileType(data);
                    ext = type && type.ext ? `.${type.ext}` : ext;
                    return writeFile(path.resolve(`${root}/data/whitepaper/${name}${ext}`), data);

                })
                .then(() => {
                        console.log(`${whitePaperAddr} is saved! ${count}/${total}`);
                        let errlog = null;
                        if (ext === "") errlog = `[No Extension] not a proper file`;
                        const whitePaperSave = {'save': true, 'error': errlog};
                        dataModel.findOneAndUpdate({"targetUrl": targetUrl},
                            {$set: {"whitePaperSave": whitePaperSave}}, {upsert: true}, function (err, doc) {
                                if (err) throw console.log(`[err : update data with whitepaper save]${err}`);
                            })
                    }
                )
                .catch(err => {
                    const whitePaperSave = {'save': false, 'error': err};
                    dataModel.findOneAndUpdate({"targetUrl": targetUrl},
                        {$set: {"whitePaperSave": whitePaperSave}}, {upsert: true}, function (err, doc) {
                            if (err) throw console.log(`[err : update data with whitepaper save]${err}`);
                        })
                });

        },
        {
            concurrency: 1
        }
    ));


whitePaperDrop().then(() => {
    console.log("all white paper saving done");
    mongoose.disconnect();
});