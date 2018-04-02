const {getICOLinks } = require("./teamInfoUtil");

//const phantom = require('phantom');

getICOLinks();


/*
request(url, function(error,response,html){
    if (!error) {
        const $ = cheerio.load(html);

        var title,interest,category;
        const json = {title, interest, category};
        const $rows= $('#ended_ico');
           $rows.filter(function () {
                const data = $(this);
                const title = data.find('.ico-row > div.ico-main-info > h3 > a').text(),
                interest = data.find('.interest > div').text();
                category  = data.children('.categ_type').text();

                json.title = title;
                json.interest = interest;
                json.category = category;

                console.log(json);
            });

    }
});*/