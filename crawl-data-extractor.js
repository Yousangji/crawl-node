

const icobenchExtractor = ($,targetUrl) => {
    // get information
    //get information of The Team
    //------------------get TeamNames (Team name)
    let teamName = $('.name > h1').text();
    let preICO = false;
    if (teamName.includes('(PreICO)')) {
        teamName = teamName.replace('(PreICO)', '');
        preICO = true;
    }


    //-------------------aggregateRatings{sum,aggr}
    const total = $('.rating > div:nth-child(1)').attr('content');
    const detail = {};
    $('.rating > .distribution > .col_4').each(function () {
        const aggrRateValue = $(this).contents().first().text().trim();
        const aggrRateLabel = $(this).contents().next().text().trim();
        detail[aggrRateLabel] = aggrRateValue
    });
    const aggregateRatings = {total, detail};

    //------------------get detail information of Team
    const subTitle = $('.name > h2').text().trim();
    const detailIco = $('.ico_information > p').text().trim();
    const $categories = $('.ico_information > .categories > a');
    const categories = [];
    $categories.each(function () {
        categories.push($(this).text().trim())
    });
    const detailInfo = {subTitle, detailIco, categories};


    //-----------------get Mielstones [] : {condition,content}
    const $bubbles = $('.bubble');
    const milestone = [];
    $bubbles.each(function () {
        const condition = $(this).children('.condition').text().trim();
        const content = $(this).children('p').text().trim();
        milestone.push({condition, content})
    });

    //-----------------get Ratings []: {raterInfo, rates, review}
    const $ratings = $('.ratings_list > .row');
    const ratings = [];
    $ratings.each(function () {
        //--------------data {name,position,distribution,ratedAt}
        const $data = $(this).children('.data');
        const name = $data.children('.name').text();
        const title = $data.children('.title').text().split('Rated on');
        const position = title[0];
        const ratedAt = title[1];
        const distribution = $(this).children('.distribution').text().trim();
        const raterInfo = {name, position, distribution, ratedAt};

        //--------------rate {team,vision,product}
        const rates = {};
        $(this).find('.rate > .col_3').each(
            function () {
                const rateLabel = $(this).contents().next().text();
                const rateValue = $(this).contents().first().text();
                rates[rateLabel] = rateValue;
            }
        );

        //------------review {review content,agree}
        const $review = $(this).children('.review');
        const content = $review.children('p').text();
        const agreeNum = $review.children('.agree_count').text().substring(0, 0);
        const review = {content, agreeNum}

        ratings.push({raterInfo, rates, review})
    });


    //-------------------get WhitePaper Address
    const whitePaperAddr = $('.tabs > a:nth-child(6)').prop('href');


    //-------------------get Team social link
    const socialLinks = [];
    const $teamSocialLink = $('.fixed_data > .socials > a');
    $teamSocialLink.each(function (index) {
        const social = $(this).attr('class');
        const link = $(this).attr('href');
        socialLinks[index] = {social, link};
    });


    //-------------------get TeamMember & Advisor ETC..(Board, Expert)
    const teamMembersInfo = [];
    const $rowsOfGroup = $('#team > .row');
    $rowsOfGroup.each(function () {
        const groupRole = $(this).prev('h3').text() !== "" ? $(this).prev('h3').text() : "TeamMember";
        const $groupMembers = $(this).children('div');
        const groupMemberArr = [];

        //get MetaData of Member
        $groupMembers.each(function (index) {
            const name = $(this).find('h3').text();
            const linkedinAddr = $(this).find('.linkedin').attr('href');
            const socialLink = $(this).find('.socials').children(":not(:contains('LinkedIn'))").attr('href');
            const position = $(this).find('h4').text();
            groupMemberArr[index] = {name, linkedinAddr, socialLink, position};
        });

        teamMembersInfo.push({[groupRole]: groupMemberArr});

    });

    //------------------get Token Info
    const tokenInfo = {};
    const $tokenInfo = $('.box_left > .row');
    $tokenInfo.each(function () {
        if ($(this).children('h4').text() === "Bonus") {
            const bonus = $(this).children('.bonus_text').text().trim();
            tokenInfo["bonus"] = bonus;
        } else {

            const tokenInfoLabel = $(this).children('.label').text();
            tokenInfo[tokenInfoLabel] = $(this).children('.value').text();
        }
    });

    //----------------get Investment Info
    const investInfo ={};
    const $investInfo = $('.box_right > .row');
    $investInfo.each(function(){
        const investInfoLabel = $(this).children('.label').text();
        investInfo[investInfoLabel] = $(this).children('.value').text();
    });

    const financialInfo = {tokenInfo,investInfo};

    //------------------ get ICO Info
    const icoInfo = {};
    //only having time info, put icoStart/icoEnd data
    const hasTime = $('.financial_data > .row > div').children('label').text();
    if(hasTime === "Time") {
        const icoPeriod = $('.financial_data > .row > div').children('small').text().split(' - ');
        const icoStart = icoPeriod[0] === '' ? null : icoPeriod[0];
        const icoEnd = icoPeriod[1] === '' ? null : icoPeriod[1];
        icoInfo["icoStart"] = icoStart;
        icoInfo["icoEnd"] = icoEnd;
    }
    icoInfo["preICO"] = preICO;

    const $icoInfo = $('.financial_data > .data_row');
    $icoInfo.each(function () {
        const icoInfoLabel = $(this).children('div:nth-child(1)').text().trim();
        icoInfo[icoInfoLabel] = $(this).children('div:nth-child(2)').text().trim();
    });

    return {
        teamName,
        detailInfo,
        aggregateRatings,
        whitePaperAddr,
        financialInfo,
        icoInfo,
        socialLinks,
        teamMembersInfo,
        ratings,
        milestone,
        targetUrl
    };
};


const icodropsExtractor = ($,targetUrl) => {
    //-----------------------targetUrl
    //const targetUrl = targetUrl;

    //-----------------------teamName
    const $icoMainInfo = $('.ico-desk > div:nth-child(1) > div.ico-main-info');
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
        const rowName = $(this).find('h4').text().trim().split(':')[0].trim();
        switch (rowName) {
            case "Token Pre-sale":
            case  "Token Sale" :
                //check if it is pre-sale
                let preSale = false;
                if (rowName === "Token Pre-sale") {
                    preSale = true;
                }
                icoInfo["preSale"] = preSale;

                //put ico Sale period into icoInfo
                //(default icoPeriod format = '6 MAR – 7 APR')
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
                return;


            case "Market & Returns" :
                const marketLabel = $(this).find('.token-price-list > ul').clone().children().remove().end().text().trim();
                if (marketLabel === "FDZ token price") {
                    const priceList = [];
                    $(this).find('.token-price-list > ul >li').each(function () {
                        priceList.push($(this).text());
                    });
                    const price = "priceList";
                    marketReturns[price] = priceList;
                }

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
                return;


            case "Short Review" :
                $(this).find('.info-analysis-list > li').each(function () {
                    const reviewRow = $(this).text().trim().split(':');
                    const reviewLabel = reviewRow[0];
                    reviewInfo[reviewLabel] = reviewRow[1];
                });
                return;


            case "Additional links" :
                $(this).find('a[href]').each(function () {
                    const linkLabel = $(this).text().trim();
                    additionalLinks[linkLabel] = $(this).attr('href')
                });
                return;


            case "Screenshots" :
                //screen shots do nothing
                return;


            default :
                console.log(`[notify] icodrops has another row name = ${rowName}, in ${targetUrl}`)
                return;
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
};

module.exports = {
    icobenchExtractor,
    icodropsExtractor
};