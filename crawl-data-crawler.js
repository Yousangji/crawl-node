const axios = require('axios');
const cheerio = require('cheerio');
const {icodropsExtractor, icobenchExtractor} = require('./crawl-data-extractor');

/**
 *  crawl data depend on baseUrl
 * @param targetUrl
 * @param baseUrl
 * @returns {*}
 */
const crawlData = (targetUrl, baseUrl) => axios
    .get(targetUrl)
    .then(response => {
        const $ = cheerio.load(response.data);
        switch (baseUrl) {
            case "http://icobench.com" :
                return icobenchExtractor($,targetUrl);

            case "https://icodrops.com" :
                return icodropsExtractor($,targetUrl);
        }
    });


/**
 * if target Url is like Chart Site, get all links.
 * href links is limited by two options(linkStartWith, limitArea)
 * @param targetUrl the target Site url will be crawled
 * @param linkStartsWith limit option 1. links can be limited by startwith option
 * @param limitArea limit option 2. can ignore footer or other div which is not wanted to be crawled
 * @returns {*} all links from targetUrl as array
 */
const crawlLinks = (targetUrl, linkStartsWith, limitArea) => axios
    .get(targetUrl)
    .then(response => {
        const $ = cheerio.load(response.data);
        //-------- data result
        // find all links need to be crawl later
        const links = [];
        // getting ico links
        $(limitArea).find(`a[href^="${linkStartsWith}"]`).each(function () {
            const link = $(this).prop('href');
            if (!links.includes(link)) {
                links.push(link);
            }
        });
        return links;
    });

module.exports = {
    crawlData,
    crawlLinks
};