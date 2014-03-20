// Given a website URL, search all the links in this website & find dead or problematic links.
//
// To install prerequisites
//      npm install async cheerio request ansicolors commander
//
// To run
//      node dead_links_crawler.js

// TODO:
// 1. Better reporting of progress

(function() {
    var commander = require('commander'),
        color = require('ansicolors'),
        url = require('url'),
        request = require('request'),
        cheerio = require('cheerio'),
        async = require('async');

    commander
        .version('0.0.1')
        .usage('<url> [options]')
        .option('-t, --timeout <n>', 'Timeout, in seconds. The default is 10 seconds', parseInt)
        .parse(process.argv);

    if (commander.args.length == 0) {
        commander.help();
    }


    var visited_urls = {},

        // This is the URL that we will start from
        base_url = commander.args[0];

    // Because a crawler is IO bound, I use async HTTP requests to get the pages.
    var q = async.queue(function(task, callback) {
        visited_urls[task.url] = 1;

        request({url: task.url, timeout: commander.timeout * 1000}, function(error, response, body) {
            if (error || response.statusCode != 200) {
                console.log(
                    '(%s) %s => %s', 
                    color.red(error || response.statusCode), 
                    task.url, 
                    task.referrer);
                return;
            }
            var $ = cheerio.load(body);
            var links = $('a[href]');
            links.each(function() {
                // Get absolute links
                var href = url.resolve(task.url, $(this).attr('href'));
                
                // There are 2 possible link types
                // 1. Internal links: we just add them
                // 2. External links: we need to check external links only are in our pages, i.e. where the referrer starts
                //    with the base URL.
                if (href.indexOf('mailto:') != 0 && !(href in visited_urls)&& task.url.indexOf(base_url) > -1) {
                    q.push({url: href, referrer: task.url});
                }
            });
        });
        callback();
    }, 10);

    q.push({
        url: base_url,
        referrer: null
    });
})();