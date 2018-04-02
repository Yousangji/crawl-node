const cheerio = require('cheerio');
const axios = require('axios');
const basicUrl = "https://icobench.com/icos";


const getTeamInfo = (subUrl) => axios({
    method : 'get',
    host : 'icobench.com',
    url : basicUrl.substr(0,basicUrl.lastIndexOf("/"))+subUrl
    })
    .then((response) => {
        if (response.status === 200) {

            const html = response.data;
            const $ = cheerio.load(html);
            const advisorArr = [];

            //get Name of The Team
            const teamName = $('.name').find('h1').text();


            //get advisor's name - sociallink
            const $advisorRows = $('#team > div:nth-child(4)> div');
            $advisorRows.each(function (){
                const name = $(this).find('h3').text();
                const linkedinAddr = $(this).find('.linkedin').attr('href');
                const socialLink = $(this).find('.socials').children(":not(:contains('LinkedIn'))").attr('href');
                advisorArr.push({name,linkedinAddr,socialLink});
            });
            //console.log(advisorArr);

            //get team
            const teamArr = [];
            const $teamRows = $('#team > div:nth-child(6)> div');
            $teamRows.each(function () {
                const name = $(this).find('h3').text();
                const linkedinAddr = $(this).find('.linkedin').attr('href');
                const socialLink = $(this).find('.socials').children(":not(:contains('LinkedIn'))").attr('href');
                const position = $(this).find('h4').text();
                teamArr.push({name, linkedinAddr, socialLink, position});
            });
            //console.log(teamArr);


             let teamInfo = {advisorArr,teamArr};
             console.log(JSON.stringify({teamName,teamInfo}));
            //console.log("teamInfo" + teamInfo);
        }
    })
    .catch(function (error){
        console.log(error);
    });

const getICOLinks = () => axios.get(basicUrl)
    .then((response)=>{
        if(response.status === 200){
            const html = response.data;
            const $ = cheerio.load(html);
            let links =[];
            ($('.name').each(function (){
                links.push($(this).attr('href'));
            }));
            //console.log(links);

            for(var i = 0; i< links.length; i++ ){
                console.log(links[i]);
                getTeamInfo(links[i]);
            }
        }
    });

module.exports = {
    getICOLinks

};