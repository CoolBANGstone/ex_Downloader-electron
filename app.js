const fs = require('fs');
const http = require('http');
const path = require('path');
const math = require('math');
const colors = require('colors');
const request = require('request');
const setCookie = require('set-cookie-parser');


var downloadsfolder = require('downloads-folder');

var stage = 1;
var username, pass, loggedin = false;
var eORex = 2;

var PAGES = 0, downloading = 0, finish, HEADERS = {};
const action =  'Please select action:\n' +
                '{Manga-link}: Download from link\n' +
                `fav: Download account's favorite manga\n` +
                `file: Download from 'download.txt'\n` +
                'continue: Continue download(queue.txt)\n';
UserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:68.0) Gecko/20100101 Firefox/68.0';

const down_path = path.join(downloadsfolder(), 'e(x)hentai_download');
fs.mkdir(down_path, function(err) {});
function input() {
    const input = document.getElementById('input');
    const out = document.querySelector('.output');
    const value = input.value;
    switch (stage) {
        case 1: // Username
            username = value;
            stage = 2;
            out.innerText = 'Password:';
            document.getElementById('input').type = 'password';
            break;
        case 2: // Password
            pass = value;
            document.getElementById('input').type = 'text';
            hide('send', true);
            login(username, pass);
            break;
        case 3: // Action
            if (value == 'fav') {
                out.innerText = 'Choose download source:\n' +
                                '1: e-hentai\n' +
                                '2: exhentai (Default)';
                stage = 4;
            }else if (value == 'file') {
                stage = -1;
                fs.readFile(path.join(down_path, 'download.txt'), function (err, data) {
                    if (err) {
                        console.error(err);
                        document.querySelector('.output').innerText = 'Can\'t read download.txt, press enter to continue';
                        stage = -1;
                        return;
                    }
                    var queue = data.toString().split('\n');
                    queue.pop();
                    argv(0, queue);
                });
            }else if (value == 'continue') {
                stage = -1;
                fs.readFile(path.join(down_path, 'queue.txt'), function (err, data) {
                    if (err) {
                        console.error(err);
                        document.querySelector('.output').innerText = 'Can\'t read queue.txt, press enter to continue';
                        stage = -1;
                        return;
                    }
                    var queue = data.toString().split('\n');
                    queue.pop();
                    argv(0, queue);
                });
            }else {
                argv(0, value.split(' '));
                stage = -1;
            }
            break;
        case 4:
            out.innerText = '';
            if (value === '1')
                eORex = 1;
            else
                eORex = 2;
            stage = 5;
            get_pages();
            break;
        case 5:
            var arr = value.split(' ');
            var start = Number(arr[0]);
            var end = Number(arr[1]);
            if (start <= end && end <= PAGES) {
                hide('send', true);
                download_page(start - 1, end - 1, HEADERS);
                stage = -1;
            }
            break;
        case -1:
            out.innerText = action;
            stage = 3;
            break;
        case -2:
            out.innerText = 'Username:';
            stage = 1;
            break;
    }
    input.value = '';
}
function hide(object, status) {
    if (status)
        document.getElementById(object).style.display = 'none';
    else
        document.getElementById(object).style.display = 'block';
}
async function get_limit() {
    hide('limit', false);
    while (HEADERS != {}) {
        request.get({'url': 'https://e-hentai.org/home.php', 'headers': HEADERS}, function(err, resp, body) {
            var keyword = '<p>You are currently at <strong>';
            var index = body.indexOf(keyword) + keyword.length;
            var current, limit; current = limit = '';
            while (body[index] != '<')
                current += body[index++];
            keyword = ' towards a limit of <strong>';
            index = body.indexOf(keyword) + keyword.length;
            while (body[index] != '<')
                limit += body[index++];
            document.getElementById('limit').innerText = `Limit: ${current}/${limit}`;
        })
        await sleep(5000);
    }
}

http.globalAgent.maxSockets = Infinity;

async function exit_program() {
    hide('send', false);
    hide('progress', true); 
    document.querySelector('.output').innerText = 'Download complete!\nHit \'Enter\' to continue.';
    document.querySelector('.progress').innerText = '';
    document.getElementById('input').focus();
    stage = -1;
}
async function fetch_data(url) {
    return new Promise((resolve, reject) => {
        request({'url': url, 'headers': HEADERS}, async function(error, response, body) {
            if (error || response.statusCode !== 200) {
                console.error('Error: ' + val);
                // fs.rmdir(path.join('.', val), function(err) {});
                resolve(0);
                return;
            }
            // Get title
            var keyword = 'id=\"gj\">';
            var index = body.indexOf(keyword) + keyword.length;
            var pages, title, suburl, photo_url, dirname;
            pages = title = suburl = photo_url = '';
            index = body.indexOf(keyword) + keyword.length;
            if (index > keyword.length) {
                while (body[index] != '<' || body[index + 1] != '/' || body[index + 2] != 'h')
                    title += body[index++];
                // Get pages
                index = body.indexOf(' pages</td>');
                while (body[index - 1] != '>')
                    index--;
                while (body[index] != ' ')
                    pages += body[index++];
                pages = parseInt(pages, 10);
                // Get photo url
                keyword = '<a href=\"';
                index = body.indexOf(keyword, body.indexOf('id=\"gdt')) + keyword.length;
                while (body[index] != '\"')
                    photo_url += body[index++];
                // Get suburl
                index = url.indexOf('/g/') + 3;
                while (url[index] != '/')
                    suburl += url[index++];
                var dirname = path.join(down_path, replace_str(`${title}(${suburl})`));
                fs.mkdir(dirname, function(err) {});

                document.querySelector('.output').innerText = `${title} (${pages}p)\n${url}`;
                // console.log(photo_url);
                hide('progress', false);
                await run(pages, photo_url, dirname);
                resolve(0);
            }else {                
                hide('progress', true);
                document.querySelector('.output').innerText = `Fetch error!\nSkipping this manga...\n${url}`;
                var filename = path.join(down_path, 'queue.txt');
                fs.readFile(filename, 'utf8', function(err, data) {
                    spl = data.split('\n');
                    var linesExceptFirst = spl.slice(1).join('\n');
                    var firstline = spl[0];
                    if (linesExceptFirst !== '') {
                        fs.writeFile(filename, linesExceptFirst, (err) => {
                            if (err) console.error(err);
                            fs.appendFile(filename, firstline + '\n', function (err) {
                                if (err) console.error(err);
                            });
                        });
                    }
                });
                await sleep(2000);

                resolve(0);
            }
        });
    });
}
async function run(pages, url, dir) {
    return new Promise(async (resolveR, reject) => {
        tmp = 0;
        downloading = 0;
        const div = pages;
        finish = pages;
        document.querySelector('.progress').innerText = '0%';
        URL = {u: url};
        for (var i = 1; i <= pages; i++) {
            await get_original_url(i, URL, dir, function() {
                console.log(finish);
                document.querySelector('.progress').innerText = String(math.floor((1 - --finish / div) * 100)) + '%';
                if (finish <= 0) {
                    remove_first_line();
                    resolveR(0);
                }
            })
        }
    });
}
function get_original_url(page, URL, dir, callback) {
    return new Promise((resolve, reject) => {
        request({'url': URL.u, 'headers': HEADERS}, async function(err, resp, body) {
            var keyword = '<img id=\"img\" src=\"';
            var index = body.indexOf(keyword) + keyword.length;
            var original = '', type = '', next = '';
            while (body[index] != '\"')
                original += body[index++];
            while (body[index - 1] != '.') index--;
            while (body[index] != '\"')
                type += body[index++];

            keyword = 'href=\"';
            index = body.indexOf(keyword, body.indexOf('i3')) + keyword.length;
            while (body[index] != '\"')
                next += body[index++];
            URL.u = next;
            download_photo(original, path.join(dir, `${page}.${type}`), callback, 0);
            resolve(0);
        })
    })
}
function download_photo(url, filename, callback, cnt) {
    if (cnt > 5) {
        console.log(filename);
        callback();
        return;
    }
    request({'url': url, 'headers': HEADERS}).on('error', function(err) {
        console.error(err);
        download_photo(url, filename, callback, cnt + 1);
        return;
    }).pipe(fs.createWriteStream(filename)).on('close', callback);
}
function remove_first_line() {
    var filename = path.join(down_path, 'queue.txt');
    fs.readFile(filename, 'utf8', function(err, data) {
        var linesExceptFirst = data.split('\n').slice(1).join('\n');
        if (linesExceptFirst == '')
            fs.unlinkSync(filename);
        else
            fs.writeFile(filename, linesExceptFirst, (err) => {
                if (err)
                    console.error(err);
            });
    });
}
async function argv(start, queue, argc) {
    if (!argc) {
        var file = fs.createWriteStream(path.join(down_path, 'queue.txt'));
        file.on('error', function(err) {
            
        });
        queue.forEach(function(i) {
            file.write(i + '\n');
        });
        file.end();
    }
    return new Promise(async (resolve, reject) => {
        end = false;
        hide('send', true);
        hide('progress', false);
        document.querySelector('.output').innerText = '';
        for (var i = start; i < queue.length; i++)
            await fetch_data(queue[i]);
        hide('send', false);
        exit_program();
        resolve(0);
    });       
}
async function logging_in_text() {
    var cnt = 1;
    while (!loggedin) {
        var str = 'Logging in';
        for (var i = cnt; i; i--)
            str += '.';
        if (cnt == 3)
            cnt = 1;
        else
            cnt++;
        if (!loggedin)
            document.querySelector('.output').innerText = str;
        else
            break;
        await sleep(200);
    }
}
async function login(username, pass, test) {
    // Login
    if (test) {
        HEADERS = {
            'User-Agent': UserAgent,
            'Cookie': `ipb_member_id=${MY_MEMBER_ID}; ipb_pass_hash=${MY_PASS_HASH};`,
        };
        get_limit();
        hide('send', false);
        document.getElementById('input').focus();
        document.querySelector('.output').innerText = action;
        stage = 3;
    }else {
        loggedin = false;
        logging_in_text();
        var options = {
            url: 'https://forums.e-hentai.org/index.php/',
            form: {
                'act': 'Login',
                'CODE': '01',
                'CookieDate': '1',
                'b': 'd',
                'bt': '1-6',
                'UserName': username,
                'PassWord': pass,
                'ipb_login_submit': 'Login!'},
            headers: {
                // Host: 'forums.e-hentai.org',
                'User-Agent': UserAgent
            }
        };
        request.post(options, async function(err, resp, body) {
            loggedin = true;
            var cookies = setCookie.parse(resp.headers['set-cookie'], {
                decodeValues: true,
                map: true
            });
            // console.log(cookies);
            try { 
                HEADERS = {
                    'User-Agent': UserAgent,
                    'Cookie': `ipb_member_id=${cookies.ipb_member_id.value}; ipb_pass_hash=${cookies.ipb_pass_hash.value}; `,
                };
            }catch(e) {
                if (e) {
                    hide('send', false);
                    document.querySelector('.output').innerText = 'Login error, press enter to retry.';
                    document.getElementById('input').focus();
                    stage = -2;
                    return;
                }
            }
            // console.log(HEADERS);
            request({
                url: 'https://exhentai.org/favorites.php',
                headers: HEADERS
            }, function(err, resp, body) {
                if (err) {
                    hide('send', false);
                    document.querySelector('.output').innerText = 'Login error, press enter to retry.';
                    document.getElementById('input').focus();
                    stage = -2;
                    return;
                }
                get_limit();
                hide('send', false);
                document.getElementById('input').focus();
                document.querySelector('.output').innerText = action;
                stage = 3;
            })
        })
    }
}
function get_pages() {
    hide('send', true);
    var url = 'exhentai.org';
    if (eORex == 1)
        url = 'e-hentai.org';
    url = `https://${url}/favorites.php`;
    request({'url': url, headers: HEADERS}, function (err, resp, body) {
        var keyword = 'lass=\"ip\">Showing ';
        var results = '';
        var index = body.indexOf(keyword) + keyword.length;
        if (index < keyword.length) {
            stage = -1;
            document.querySelector('.output').innerText = 'Fetch error or no favorites, press enter to retry.'
            hide('send', false);
            document.getElementById('input').focus();
            return;
        }
        while (body[index] != ' ')
            results += body[index++];
        PAGES = math.ceil(parseInt(results) / 50);
        document.querySelector('.output').innerText = `Total pages: ${PAGES}\n` + 
                                                      'Insert download page range: (ex. \"1 5\")';
        hide('send', false);
        document.getElementById('input').focus();
    })
}
function get_page_data(page, headers, queue_obj) {
    return new Promise(async (resolve, reject) => {
        var host = 'exhentai.org';
        if (eORex == 1)
            host = 'e-hentai.org';
        request({
            url: `https://${host}/favorites.php?page=${page}`,
            headers: headers
        }, async function(error, response, body) {
            var index_pre = 0;
            var last = '';
            var keyword = `https://${host}/g/`;
            while (1) {
                var index = body.indexOf(keyword, index_pre);
                var val = '';
                if (index == -1) {
                    resolve(0);
                    break;
                }
                while (body[index] != '\"')
                    val += body[index++];
                if (val != last) {
                    last = val;
                    queue_obj.queue.push(val);
                }
                index_pre = index;
            }
        });
    });
}
function download_page(start, end, headers) {
    return new Promise(async (resolve, reject) => {
        var queue = [];
        for (; start <= end; start++) {
            await get_page_data(start, headers, {queue});
        }
        await argv(0, queue);
        resolve(0);
    });
}

function replace_str(str) {
    str = str.replace(/\//g, ' ');
    str = str.replace(/\\/g, ' ');
    str = str.replace(/:/g, ' ');
    str = str.replace(/\*/g, ' ');
    str = str.replace(/\"/g, ' ');
    str = str.replace(/</g, '(');
    str = str.replace(/>/g, ')');
    str = str.replace(/\|/g, ' ');
    str = str.replace(/\?/g, '？');
    return str;
}
function sleep(ms){
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}