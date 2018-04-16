const axios = require('axios');
const cheerio = require('cheerio');

/**
 * get url and extract data and saved to database and return any new jobs if found
 * @param subUrl
 * @returns {Promise<T>}
 */
const crawlData = targetUrl => axios
    .get(targetUrl)
    .then(response => {
        const $ = cheerio.load(response.data);

        //-----------------------targetUrl
        //const targetUrl = targetUrl;

        //-----------------------teamName
        const $icoMainInfo = $('.ico-desk > div:nth-child(1) > div.ico-main-info');//todo: icodesk
        const teamName = $icoMainInfo.children('h3').text();

        //-----------------------detailInfo
        const subTitle = $icoMainInfo.find('.ico-description').text().trim();
        const categories = $icoMainInfo.find('.ico-category-name').clone().children().remove().end().text().trim().replace('(', '').replace(')', '');
        const detailInfo = {subTitle, categories};


        //-----------------------whitePaperAddr & Links
        const socialLinks = {};
        const $rightCol = $('.ico-right-col');
        const whitePaperAddr = $rightCol.find('a').next().attr('href');
        socialLinks["webSite"] = $rightCol.find('a').first().attr('href');

        //-----------------------socialLinks
        $rightCol.find('.soc_links').children('a').each(function () {
            const socialLabel = $(this).children('i').attr('class').replace('fa fa-', '').split('-')[0];
            socialLinks[socialLabel] = $(this).attr('href');
        });


        //-----------------------icoInfo
        const icoInfo = {};
        const reviewInfo = {};
        const additionalLinks = {};
        const rating = {};
        const marketReturns = {};

        //icoInfo.fundStatus
        icoInfo["fundStatus"] = $rightCol.find('.fund-goal').text().replace(/\r\n\t|\n|\r\t/gm, "");
        //icoInfo.icoStatus
        icoInfo["icoStatus"] = $('.ico-breadcrumb > .text-center > li:nth-child(2)').find('a').text().trim();


        //seperate rating row, because it has not <div> class=row
        const $ratingField = $('.ico-desk > .rating-field');
        $ratingField.find('.rating-box').each(function () {
            const rateLabel = $(this).children('p').first().text();
            rating[rateLabel] = $(this).children('p').next().text();
        });

        $('.ico-desk > .row ').each(function () {

            let rowName = $(this).find('h4').text().trim().split(':')[0];
            console.log(rowName);
            if (rowName === "Token Sale") {//icoPeriod format = '6 MAR – 7 APR'
                const icoPeriod = $(this).find('h4').text().trim().split(':')[1].split(' – ');
                if (icoPeriod.length > 1) {
                    const icoStart = icoPeriod[0].trim();
                    const icoEnd = icoPeriod[1].trim();
                    icoInfo["icoStart"] = icoStart;
                    icoInfo["icoEnd"] = icoEnd;

                } else {// if format is not formal put string as icoPeriod
                    icoInfo["icoPeriod"] = icoPeriod[0].trim();
                }

                //icoInfo rows
                $(this).find('.col-md-6 > li').each(function () {
                    const icoInfoRow = $(this).text().trim().split(':');
                    const icoInfoLabel = icoInfoRow[0];
                    icoInfo[icoInfoLabel] = icoInfoRow[1].replace(/(\r\n\t|\n|\r\t)/gm, "");
                });

            }
            else if (rowName === "Market & Returns") {
                // const marketLabel = $(this).find('.token-price-list > ul').clone().children().remove().end().text().trim();
                //  if (marketLabel === "FDZ token price") {
                const priceList = [];
                $(this).find('.token-price-list > ul >li').each(function () {
                    priceList.push($(this).text());
                });
                const price = "priceList";
                marketReturns[price] = priceList;
                // }

                const marketInfo = {};
                $(this).find('.market-info > .col-6').each(function () {
                    const marketInfoLabel = $(this).children('.lable').text();
                    const marketInfoAmount = $(this).children('.amount').text();
                    return marketInfo[marketInfoLabel] = marketInfoAmount
                });
                const market = "market";
                marketReturns[market] = marketInfo;


                const icoRoi = {};
                $(this).find('.ico-roi > li').each(function () {
                    const roiCurrency = $(this).children('.roi-currency').text();
                    const roiAmount = $(this).children('.roi-amount').text();
                    icoRoi[roiCurrency] = roiAmount;
                });
                const icoRoiStr = "icoRoi";
                marketReturns[icoRoiStr] = icoRoi;

            }
            else if (rowName === "Short Review") {
                $(this).find('.info-analysis-list > li').each(function () {
                    const reviewRow = $(this).text().trim().split(':');
                    const reviewLabel = reviewRow[0];
                    reviewInfo[reviewLabel] = reviewRow[1];
                });
            } else if (rowName === "Additional links") {
                $(this).find('a[href]').each(function () {
                    const linkLabel = $(this).text().trim();
                    additionalLinks[linkLabel] = $(this).attr('href')
                });
            }
            else if (rowName === "Screenshots") {//screen shots do nothing
            } else {
                console.log(`[notify] icodrops has another row name = ${rowName}, in ${targetUrl}`)
            }

        });


        return {
            targetUrl,
            teamName,
            detailInfo,
            whitePaperAddr,
            socialLinks,
            icoInfo,
            reviewInfo,
            additionalLinks,
            marketReturns,
            rating
        };
    });

const crawlLinks = (targetUrl, linkStartsWith) => axios
    .get(targetUrl)
    .then(response => {
        const $ = cheerio.load(response.data);
        //-------- data result
        // find all links need to be crawl later
        const links = [];
        // getting ico links
        // get links in content only not footer
        $('#content').find(`a[href^="${linkStartsWith}"]`).each(function () {
            const link = $(this).attr('href');
            //중복제거
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