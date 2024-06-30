var http = require('http');
var mysql = require('mysql');
var url = require('url');

// URL에 하이퍼링크 추가하는 함수
function addHyperlinksToComments(data) {
    const urlPattern = /https?:\/\/\S+/g;
    let processedData = [];
    data.forEach(item => {
        let { idx, name, score, comment, lastauth } = item;
        if (comment) {
            // 정규표현식으로 URL 추출
            let urls = comment.match(urlPattern);
            // 추출된 URL에 하이퍼링크 추가
            if (urls) {
                urls.forEach(url => {
                    comment = comment.replace(url, `<a href="${url}" target="_blank">${url}</a>`);
                });
            }
        }
        processedData.push({ idx, name, score, comment, lastauth });
    });
    return processedData;
}

var app = http.createServer(function (request, response) {
    var queryData = url.parse(request.url, true).query;

    // 페이지와 페이지 당 항목 수 설정
    var per_page = 10;
    var page = queryData.page ? parseInt(queryData.page) : 1;
    var offset = (page - 1) * per_page;

    // DB 연동
    const connection = mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'board',
        charset: 'utf8'
    });

    connection.connect();

    // 쿼리 실행
    connection.query(
        "SELECT idx, name, score, IFNULL(comment, '') AS comment, lastauth FROM board ORDER BY score DESC LIMIT ? OFFSET ?;",
        [per_page, offset],
        (error, rows, fields) => {
            if (error) {
                response.writeHead(500, { 'Content-Type': 'text/plain' });
                response.end('Database query error');
                connection.end();
                return;
            }

            let processedRows = addHyperlinksToComments(rows);

            // 점수 기준으로 인덱스 부여
            processedRows.forEach((row, index) => {
                row.rank = offset + index + 1; // 전체 순위 부여
            });

            // 쿼리 결과를 기반으로 HTML 템플릿 생성
            var tableRows = processedRows.map(row => `
                <tr>
                    <td>
                        ${row.rank === 1 ? '&#129351;' :  // Gold Medal
                         row.rank === 2 ? '&#129352;' :  // Silver Medal
                         row.rank === 3 ? '&#129353;' :  // Bronze Medal
                         row.rank} <!-- 숫자를 문자열로 변환 -->
                    </td>
                    <td>${row.name}</td>
                    <td>${row.score}</td>
                    <td>${row.comment}</td>
                    <td>${row.lastauth}</td>
                </tr>
            `).join('');

            var template = `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Webhacking.kr</title>
            <link id="favicon" rel="icon" type="image/x-icon" href="/static/favicon.ico">
            <style>
                /* 테이블 */
                .table-container {
                    width: 90%;
                    overflow-x: auto;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    margin: 60px auto 20px; /* 상단바 높이만큼 여백 추가 */
                }
                .table-container table tr.specialtable td {
                    border: none; /* 특정 테이블 행의 border 제거 */
                }

                .table-container table {
                    border-collapse: collapse; /* 테이블 테두리 합병 설정 */
                }
                .table-container table tr {
                    border: none; /* 테이블의 모든 행에 있는 border 제거 */
                }
                table {
                    border-collapse: collapse;
                    font-size: medium;
                    text-align: center;
                    height: 10px;
                }
                th {
                    text-align: center;
                    font-weight: bold;
                    background-color: #f2f2f2;
                    line-height: 0.4;
                }
                td {
                    text-align: center;
                    line-height: 0.4;
                }
                tr:nth-child(even) {
                    background-color: #f2f2f2;
                }
                /* 페이지네이션 */
                .pagination {
                    text-align: center;
                    list-style-type: none;
                    padding: 0;
                    margin: 20px auto; /* 페이지네이션과 테이블 사이 여백 */
                    position: fixed; /* 페이지네이션 고정 */
                    bottom: 0; /* 화면 하단에 위치 */
                    left: 50%; /* 중앙 정렬을 위해 추가 */
                    transform: translateX(-50%); /* 중앙 정렬 */
                    background-color: #fff; /* 페이지네이션 배경색 설정 */
                    z-index: 1000; /* 다른 요소 위에 표시되도록 설정 */
                }
                .pagination li {
                    display: inline-block;
                }
                .h3 {
                    font-size: 1.75rem;
                    margin-top: 0;
                    margin-bottom: .5rem;
                    font-weight: 500;
                    line-height: 1.2;
                    text-align: left;
                }
                /* body */
                body {
                    font-family: 'Noto Sans KR', sans-serif, 'Segoe UI Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', 'Apple Color Emoji', 'EmojiSymbols', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    margin: 0; /* body의 기본 마진 제거 */
                }
                /* 상단 메뉴바 */
                .menu {
                width: 100%;
                height: 50px;
                text-align: center;
                background-color: #212529;
                color: white;
                position: fixed;
                top: 0;
                left: 0; /* 왼쪽 끝에 고정 */
                z-index: 1000;
                border-bottom: none; /* 바로 밑에 있는 border 제거 */
                }

                .menu nav {
                    width: 100%; /* 너비를 100%로 설정하여 전체 너비를 차지하도록 함 */
                }

                .menu nav ul {
                    padding: 0;
                    margin: 0;
                    list-style-type: none;
                    display: flex; /* 메뉴 항목을 수평으로 배치 */
                    justify-content: flex-start; /* 왼쪽으로 정렬 */
                }

                .menu nav ul li {
                    margin-right: 0px; /* 각 메뉴 항목 사이의 간격 설정 */
                }

                .menu nav ul li:last-child {
                    margin-right: 0; /* 마지막 메뉴 항목의 간격은 없앰 */
                }

                .menu nav ul li a {
                    line-height: 50px; /* 세로 중앙 정렬 */
                    height: 50px;
                    padding: 0 15px; /* 내부 여백 설정 */
                    text-decoration: none;
                    color: #888; /* 기본 회색 글씨 색상 */
                    transition: color 0.3s ease; /* 색상 변화에 트랜지션 효과 추가 */
                    font-size: 18px; /* 글씨 크기 설정 */
                }
                .menu nav ul li a.active {
                    color: white; /* 선택된 메뉴 글씨색을 흰색으로 변경 */
                    font-weight: bold; /* 선택된 메뉴 글씨를 볼드체로 변경 */
                    /* 다른 스타일 추가 가능 */
            }
                .menu nav ul li a:hover,
                .menu nav ul li a.active {
                    color: white; /* 선택했을 때나 호버 시 흰색 글씨로 변경 */
                }

            </style>
            <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
            </head>
            <body>
                <div class="menu">
                    <nav>
                        <ul>
                            <li><a href="http://127.0.0.1:9999">Home</a></li>
                            <li><a href="">Challenge</a></li>
                            <li><a href="">Ranking</a></li>
                            <li><a href="">Hall of Fame</a></li>
                            <li><a href="">Contact</a></li>
                        </ul>
                        <a id="pull" href="#"></a>
                    </nav>
                </div>

                <div class="table-container">
                    <table class="table">
                        <tr class="specialtable">
                            <td colspan="5"><p class="h3">😎</p></td>
                        </tr>
                        <tr class="header">
                            <th>#</th>
                            <th>Name</th>
                            <th>Score</th>
                            <th>Comment</th>
                            <th>Lastauth</th>
                        </tr>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div>
                    <ul class="pagination">
                        <li class="page-item"><a class="page-link" href="?page=1">1</a></li>
                        <li class="page-item"><a class="page-link" href="?page=2">2</a></li>
                        <li class="page-item"><a class="page-link" href="?page=3">3</a></li>
                    </ul>
                </div>
            </body>
            </html>
            `;

            // 응답 헤더 설정
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.end(template);
            connection.end();
        }
    );
});

app.listen(3000, () => {
    console.log('Server is running at http://127.0.0.1:3000');
});
