const Promise = require("bluebird");
const union = require("lodash.union");
const fs = require("fs");
const path = require('path');
const {URL} = require('url');
const download = require('download');
const writeFile = Promise.promisify(fs.writeFile);
const root = __dirname;
const fileType = require('file-type');
const {crawlLinks, crawlData} = require("./crawl-data-crawler");

//---------database
const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/icoscrap');
const Schema = mongoose.Schema;

//db Schema model
const icobenchLink = new Schema({
    targetUrl: String,
    baseUrl: String,
    trial: {type: Number, default: 0},
    done: {type: Boolean, default: false},
    error: {type: String, default: null}
}, {
    timestamps: true
});
const icobenchData = new Schema({
    teamName: String,
    detailInfo: Schema.Types.Mixed,
    aggregateRatings: Schema.Types.Mixed,
    whitePaperAddr: String,
    financialInfo: Schema.Types.Mixed,
    icoInfo: Schema.Types.Mixed,
    socialLinks: Schema.Types.Mixed,
    teamMembersInfo: Schema.Types.Mixed,
    ratings: Schema.Types.Mixed,
    milestone: Schema.Types.Mixed,
    targetUrl: String,
    whitePaperSave: Schema.Types.Mixed
}, {timestamps: true});

const icodropsLink = new Schema({
    teamName: String,
    detailInfo: Schema.Types.Mixed,
    aggregateRatings: Schema.Types.Mixed,
    whitePaperAddr: String,
    financialInfo: Schema.Types.Mixed,
    icoInfo: Schema.Types.Mixed,
    socialLinks: Schema.Types.Mixed,
    teamMembersInfo: Schema.Types.Mixed,
    ratings: Schema.Types.Mixed,
    milestone: Schema.Types.Mixed,
    targetUrl: String,
    whitePaperSave: Schema.Types.Mixed
}, {timestamps: true});

const icodropsData = new Schema({
    teamName: String,
    detailInfo: Schema.Types.Mixed,
    whitePaperAddr: String,
    icoInfo: Schema.Types.Mixed,
    socialLinks: Schema.Types.Mixed,
    rating: Schema.Types.Mixed,
    marketReturns: Schema.Types.Mixed,
    reviewInfo: Schema.Types.Mixed,
    additionalLinks: Schema.Types.Mixed,
    targetUrl: String,
    whitePaperSave: Schema.Types.Mixed
}, {timestamps: true});

const link = icobenchLink;
const data = icobenchData;
const linkModel = mongoose.model('link-icodrops', link);
const dataModel = mongoose.model('metadata-icodrops', data);


const icodropsConfig = {
    "nodeArr": ["ended-ico", "upcoming-ico", "active-ico"],
    "baseUrl": "https://icodrops.com/category/",
    "startWith": "https://icodrops.com/",
    "limitArea": "#content"
};

const icobenchConfig = {
    "nodeArr": [...new Array(228).keys() + 1], // array from 0 to 254
    "baseUrl": "https://icobench.com/icos?page=",
    "startWith": "/ico/",
    "limitArea": "#page"
};


/**
 *  crawl All links
 * @param baseUrl  : base url
 * @param nodeArr : chart paging node ex. [1,2,3] ,[ended-ico,upcoming-ico,active-ico]
 * @param startWith : crawl url only start with this
 * @param limitArea : limit crawl area as selector
 * @returns {*} all links should be crawled
 */
const crawlAllLinks = ({baseUrl, nodeArr, startWith, limitArea}) => {
    return Promise.map(nodeArr, node => crawlLinks(`${baseUrl}${node}`, startWith, limitArea), {concurrency: 1})
        .then(result => {
            console.log("[notify] crawlLinks ended");
            // same as  union.apply(null,result); same as union(result[0],result[1],...)
            return union(...result);
        });
};


/**
 * save all link data in db
 * @param baseUrl
 * @param links
 */
const saveCrawledLinks = links => {
    //-------------save link in DB
    Promise.map(links, link => {
        linkModel.findOneAndUpdate({"targetUrl": link}, {
            $set: {"targetUrl": link}
        }, {upsert: true, setDefaultsOnInsert: true, new: true}, function (err, doc) {
            if (err) {
                console.log("mongo error : error while upserting new links")
            }
            ;
            //console.log(`link : ${link } / db save done `)
        })
    })
};


/**

 * @param links
 */

/**
 * crawl data from given Links, save data in mongo then,
 * update link data if succeeded or not
 * @param links to be crawled data
 * @returns {null|void|*}
 */
const crawlAndSaveAllData = links => {
    const total = links.length;
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

            //--------------------update link data(trial, error) in db,  if crawling data failed
            linkModel.findOneAndUpdate({"url": link}, {
                $set: {"error": error},
                $inc: {"trial": 1}
            }, function (err, res) {
                if (err) throw console.log(`[error : ${err}] update crawling failed link `);
            })
        }), {concurrency: 1})
};


/**
 * resolve whitepaper url to downloadable url
 * @param paperUrl saved url in db
 * @returns {*} downloadable url
 */
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

/**
 * request with given whitepaperAddr urls , download, writefile
 * @param results
 * @returns {*}
 */
const whitePaperDrop = (results) => {
    const total = results.length;
    return Promise.map(results, ({targetUrl, whitePaperAddr}) => {

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
    )
};



//crawlAllLinks -> saveCrawledLinks
// crawlAllLinks(icodropsConfig)
//     .then(links => saveCrawledLinks(links))
//     .then(()=>console.log("done"));


// //get links undone from database and then crawl all data
// linkModel
//     .find({})
//     .select({"targetUrl": 1, "_id": 0})
//     .then(results => results.map(result => result['targetUrl']))
//     .then(targetUrls => crawlAndSaveAllData(targetUrls))
//     .then(() => {
//         console.log("done");
//         mongoose.disconnect()
//     });


//
// dataModel
//     .find({"whitePaperAddr": {$ne: null}, "whitePaperSave": {$exists: false}})
//     .select({
//         "whitePaperAddr": true,
//         "targetUrl": true,
//         "_id": false
//     })
//     .then(results => whitePaperDrop(results))
//     .then(() => {
//         console.log("all white paper saving done");
//         mongoose.disconnect();
//     });

