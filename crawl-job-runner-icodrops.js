const Promise = require("bluebird");
const union = require("lodash.union");
const fs = require("fs");
const path = require('path');
const {URL} = require('url');
const download = require('download');
const writeFile = Promise.promisify(fs.writeFile);
const root = __dirname;
const fileType = require('file-type');
const {crawlLinks, crawlData} = require("./crawl-data-extractor-icodrops");

//---------database
const mongoose = require('mongoose');
mongoose.connect('mongodb://10.10.122.49:27017/ico-crawler');
const Schema = mongoose.Schema;
const link = new Schema({
    targetUrl: String,
    baseUrl: String,
    trial: {type: Number, default: 0},
    done: {type: Boolean, default: false},
    error: {type: String, default: null}
}, {
    timestamps: true
});
const data = new Schema({
    teamName: String,
    detailInfo: Schema.Types.Mixed,
    whitePaperAddr: String,
    icoInfo: Schema.Types.Mixed,
    socialLinks: Schema.Types.Mixed,
    rating: Schema.Types.Mixed,
    marketReturns : Schema.Types.Mixed,
    reviewInfo:Schema.Types.Mixed,
    additionalLinks : Schema.Types.Mixed,
    targetUrl: String,
    whitePaperSave: Schema.Types.Mixed
}, {timestamps: true});


const linkModel = mongoose.model('icodrops-link', link);
const dataModel = mongoose.model('icodrops-metadata', data);


let total;
let count = 0;

/*
request every chart page and get all links return as a array
 */
const crawlAllLinks = () => {

    const categories = ["ended-ico","upcoming-ico","active-ico"];
    return Promise.map(categories, category => crawlLinks(`https://icodrops.com/category/${category}`, "https://icodrops.com/"), {concurrency: 1})
        .then(result => {
            console.log("[notify] crawlLinks ended");
            // same as  union.apply(null,result); same as union(result[0],result[1],...)
            return union(...result);
        });
};

//pass links array and write db
const saveCrawledLinks = () => crawlAllLinks()
    .then(links => {
        total = links.length;
        //-------------save link in DB
         return Promise.map(links, link => {
            linkModel.findOneAndUpdate({"targetUrl": link }, {
                $set: {
                    "targetUrl": link,
                    baseUrl: `https://icodrops.com`,
                }
            }, {upsert: true, setDefaultsOnInsert: true, new: true}, function (err, doc) {
                if (err) {console.log("mongo error : error while upserting new links")}
                count++;
                console.log(`link : ${link} / db save done ${count}/${total}`)
            });
         },{concurrency:1})
    })
    .then(() => {
        console.log("done");
        //mongoose.connection.close()
    });


/**
 * request with links , crawl data, save data in mongo then, if succeed update link done = true if not update link error.log
 * @param links
 */
const crawlAllData = (links) => {
    total = links.length;
    return Promise.each(links, link => crawlData(link)
        .then(data => {

            count++;
            console.log(`${link} is started! ${count}/${total}`);
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
};

//get links undone from database and then crawl all data
function crawlAllDataWithUndoneLinks() {
    return linkModel
        .find({})
        .select({"targetUrl": 1, "_id": 0})
        .then(results => results.map(result => result['targetUrl']))
        .then(targetUrls => crawlAllData(targetUrls))
        .then(() => {
            console.log("done");
            mongoose.disconnect()
        });
}

//crawlAllDataWithUndoneLinks();

//crawlData("﻿https://icodrops.com/pre/apex/").then(result => console.log(result));

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



const whitePaperDrop = () => dataModel
   // .find({"whitePaperAddr": {$ne: null}, "whitePaperSave": {$exists: false}})
    .find({"whitePaperAddr": {$ne: null}})
    .select({
        "whitePaperAddr": true,
        "targetUrl": true,
        "_id": false
    })
    .then(results => {
        total = results.length;
        return Promise.map(results, ({targetUrl, whitePaperAddr}) => {

                const paperUrl = resolveWhitePaperURL(whitePaperAddr);
                const urlSplit = targetUrl.split('/');
                const name = urlSplit[urlSplit.length-2];
                let ext = path.extname(paperUrl);
                count++;
                return download(paperUrl)
                    .then(data => {
                        const type = fileType(data);
                        ext = type && type.ext ? `.${type.ext}` : ext;
                        return writeFile(path.resolve(`${root}/data/icodrops/${name}${ext}`), data);

                    })
                    .then(() => {
                            console.log(`${whitePaperAddr} is saved! ${count}/${total}`);
                            let errlog = null;
                            if (ext !== ".pdf") errlog = `[No Extension] not a proper file`;
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
        )
    });


whitePaperDrop().then(() => {
    console.log("all white paper saving done");
    mongoose.disconnect();
});

