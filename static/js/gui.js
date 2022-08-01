var socket = io.connect();

var error_timer;
socket.on('error', function(error) {
    var sec = 15;
    if (error.type == "ready") {
        document.getElementsByClassName("error ready")[0].innerHTML = "지문 센서 연결됨";
        sec = 3;
    }
    else {
        document.getElementsByClassName("error info")[0].innerHTML = error.data;
    }

    clearTimeout(error_timer);

    var check = document.getElementById("error");
    if ( !check.classList.contains("page-open") ) check.classList.add("page-open");

    var elem = document.getElementsByClassName("timer-bar error")[0];

    elem.style.transition = "";
    elem.style.width = "100%";
    setTimeout(function() {
        elem.style.transition = "width " + sec + "s linear";
        elem.style.width = 0;
    }, 10);
    
    error_timer = setTimeout(function() {
        document.getElementById("error").classList.remove("page-open");
    }, sec*1000);

    console.log(error);
});

var check_timer;
socket.on('f_check_reply', function(data) {

    if ( data.state ) {
        document.getElementsByClassName("check st-info")[0].innerHTML = data.data.st_id + " " + data.data.st_name;
        var label = document.getElementsByClassName("check label")[0];

        if ( label.classList.contains("check-hagyo") ) label.classList.remove("check-hagyo");
        else if ( label.classList.contains("check-deungyo") ) label.classList.remove("check-deungyo");

        label.classList.add(data.data.st_state == '0' ? "check-hagyo":"check-deungyo");
        label.innerHTML = data.data.st_state == '0' ? "하교":"등교";
    }
    else {
        document.getElementsByClassName("check st-info")[0].innerHTML = "일치하는 지문을 찾을 수 없습니다";
        document.getElementsByClassName("check label")[0].innerHTML = "";
    }

    clearTimeout(check_timer);

    var check = document.getElementById("check");
    if ( !check.classList.contains("page-open") ) check.classList.add("page-open");

    var elem = document.getElementsByClassName("timer-bar check")[0];

    elem.style.transition = "";
    elem.style.width = "100%";
    setTimeout(function() {
        elem.style.transition = "width 1.5s linear";
        elem.style.width = 0;
    }, 10);
    
    check_timer = setTimeout(function() {
        document.getElementById("check").classList.remove("page-open");
    }, 1500);

    console.log(data);
});

socket.on('f_enroll_reply', function(data) {
    var e_process = document.getElementById("e-process");

    e_process.innerHTML = data.data;
    if ( data.type === "enroll" ) {
        if ( data.state === "step-1" || data.state === "step-2") {
            e_process.innerHTML += `<br><br><br><i class="fa-solid fa-fingerprint fa-2x"></i>`;
        }
        
    }
    else {
        if ( data.state === "step-failed" || data.state === "notfinger" ) {
            e_process.innerHTML += `<br><br><br><i class="fa-solid fa-fingerprint fa-2x red"></i>`;
        }

        var btn_end = document.createElement("a");
        btn_end.href = "#";
        btn_end.classList.add("btn-end");
        btn_end.classList.add("enroll");
        btn_end.classList.add("absolute");
        btn_end.innerHTML = "확인";
        
        btn_end.addEventListener("click", function() {
            btn_end.parentElement.classList.replace("appear", "disappear");
            btn_end.parentElement.parentElement.firstElementChild.classList.replace("disappear", "appear");
            btn_end.parentElement.parentElement.parentElement.classList.remove("page-open");

            document.getElementsByClassName("enroll step-2")[0].innerHTML = `<h2 id="e-process"></h2>`;
        });

        e_process.parentElement.appendChild(btn_end);
    }
    console.log(data);
});

socket.on('f_delete_reply', function(data) {
    var element = document.getElementsByClassName("delete step-2")[0];
    element.classList.add("disappear");
    setTimeout(function() {
        document.getElementById("d-result").innerHTML = data.data;

        element.classList.remove("appear");
    
        element.nextElementSibling.classList.replace("disappear", "appear");
    }, 201);
    console.log(data);
});

socket.on('reply_list', function(data) {
    document.getElementById("st_body").innerHTML = "";
    document.getElementById("st_body").dataset.length = data.length;
    for ( var i = 0; i < data.length; i++ ) {
        var element = document.createElement("tr");
        element.classList.add("st")
        element.innerHTML = `<td><span class="st-id">` + data[i].st_id + `</span></td>
                        <td><span class="st-name">` + data[i].st_name + `</span></td>
                        <td><span class="label ` + (data[i].st_state == '0' ? "label-hagyo":"label-deungyo")+ `">` + (data[i].st_state == '0' ? "하교":"등교") + `</span></td>
                        <td>
                            <a href="#" class="table-link delete" data-st_id="` + data[i].st_id + `" data-st_name="` + data[i].st_name + `">
                                <span class="fa-stack">
                                    <i class="fa fa-square fa-stack-2x"></i>
                                    <i class="fa fa-trash-can fa-stack-1x fa-inverse"></i>
                                </span>
                            </a>
                        </td>`;
        
        document.getElementById("st_body").appendChild(element);
    }

    Array.from(document.getElementsByClassName("table-link delete")).forEach(function(element) {
        element.addEventListener("click", function() {
            document.getElementById("delete").dataset.st_id = element.dataset.st_id;

            document.getElementById("delete_st-info").innerHTML = element.dataset.st_id + " " + element.dataset.st_name;

            document.getElementById("delete").classList.add("page-open");
        });
    });

    var number = document.getElementById("number");
    number.innerHTML = "(" + data.length + ")";
    number.style.marginRight = (28 - (number.clientWidth/2)) + "px";
});

document.getElementById("btn-list").addEventListener("click", function() {
    socket.emit('request_list');
    document.getElementById("list").classList.add("page-open");
});

function resetEnroll() {
    document.getElementById("enroll-st-id").value = "";
    document.getElementById("enroll-st-name").value = "";
    document.getElementById("enroll-st-next").classList.replace("appear", "disappear");
}

document.getElementById("btn-enroll").addEventListener("click", function() {
    document.getElementById("enroll").classList.add("page-open");
});

document.getElementById("enroll-st-id").addEventListener("input", function() {
    var val1 = document.getElementById("enroll-st-id").value;
    var val2 = document.getElementById("enroll-st-name").value;

    if ( val1 != "" && val2 !="" ) {
        document.getElementById("enroll-st-next").classList.replace("disappear", "appear");
    }
    else {
        document.getElementById("enroll-st-next").classList.add("disappear");
        setTimeout(function() {
            document.getElementById("enroll-st-next").classList.remove("appear");
        }, 201);
    }
});

document.getElementById("enroll-st-name").addEventListener("input", function() {
    var val1 = document.getElementById("enroll-st-id").value;
    var val2 = document.getElementById("enroll-st-name").value;

    if ( val1 != "" && val2 !="" ) {
        document.getElementById("enroll-st-next").classList.replace("disappear", "appear");
    }
    else {
        document.getElementById("enroll-st-next").classList.add("disappear");
        setTimeout(function() {
            document.getElementById("enroll-st-next").classList.remove("appear");
        }, 201);
    }
});

Array.from(document.getElementsByClassName("btn-next")).forEach(function(element) {
    element.addEventListener("click", function() {
        var el = element.parentElement.closest(".appear");
        el.classList.add("disappear");
        setTimeout(function() {
            el.classList.remove("appear");

            if ( element.classList.contains("enroll") ) {
                el.nextElementSibling.classList.replace("disappear", "appear");
                var data = {"st_id": document.getElementById("enroll-st-id").value, "st_name": document.getElementById("enroll-st-name").value}

                socket.emit("request_enroll", data);
                resetEnroll();
            }
            else if ( element.classList.contains("delete") ) {
                el.nextElementSibling.classList.replace("disappear", "appear");
                var data = {"st_id": document.getElementById("delete").dataset.st_id}

                socket.emit("request_delete", data);
                document.getElementById("delete").dataset.st_id = "";
            }
            else {
                el.nextElementSibling.classList.replace("disappear", "appear");
            }
        }, 201);
    });
});

Array.from(document.getElementsByClassName("btn-goback")).forEach(function(element) {
    element.addEventListener("click", function() {
        element.closest(".page-open").classList.remove("page-open");
        
        if ( element.classList.contains("enroll") ) resetEnroll();
        else if ( element.classList.contains("error") ) {
            clearTimeout(error_timer);
        }
    });
});

Array.from(document.getElementsByClassName("btn-end")).forEach(function(element) {
    element.addEventListener("click", function() {
        element.parentElement.classList.replace("appear", "disappear");
        element.parentElement.parentElement.firstElementChild.classList.replace("disappear", "appear");
        element.parentElement.parentElement.parentElement.classList.remove("page-open");
    });
});

// 검색 기능

const escapeRegExp = function(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ch2pattern(ch) {
  // 사용자가 초성만 입력한 경우
  if (/[ㄱ-ㅎ]/.test(ch)) {
    const chToBegin = {
      ㄱ: "가".charCodeAt(0),
      ㄲ: "까".charCodeAt(0),
      ㄴ: "나".charCodeAt(0),
      ㄷ: "다".charCodeAt(0),
      ㄸ: "따".charCodeAt(0),
      ㄹ: "라".charCodeAt(0),
      ㅁ: "마".charCodeAt(0),
      ㅂ: "바".charCodeAt(0),
      ㅃ: "빠".charCodeAt(0),
      ㅅ: "사".charCodeAt(0),
      ㅆ: "싸".charCodeAt(0),
      ㅇ: "아".charCodeAt(0),
      ㅈ: "자".charCodeAt(0),
      ㅊ: "차".charCodeAt(0),
      ㅋ: "카".charCodeAt(0),
      ㅌ: "타".charCodeAt(0),
      ㅍ: "파".charCodeAt(0),
      ㅎ: "하".charCodeAt(0),
    };
    const begin = chToBegin[ch];
    const end = begin + 587;
    return `[${ch}\\u${begin.toString(16)}-\\u${end.toString(16)}]`;
  }

  // 사용자가 초성+중성 또는 초성+중성+종성을 입력한 경우
  else if (/[가-히]/.test(ch)) {
    const offset = "가".charCodeAt(0);
    const chCode = ch.charCodeAt(0) - offset;
    // 사용자가 초성+중성을 입력한 경우
    if (chCode % 28 <= 0) {
      const begin = Math.floor(chCode / 28) * 28 + offset;
      const end = begin + 27;
      return `[\\u${begin.toString(16)}-\\u${end.toString(16)}]`;
    }
    // 사용자가 초성+중성+종성을 입력한 경우
    else return ch;
  }
  // 한글이 입력되지 않은 경우
  else return escapeRegExp(ch);
}

// 퍼지 문자열 검색을 위한 정규식 생성
function createFuzzyMatcher(input) {
  const pattern = input.split("").map(ch2pattern).join(".*?");
  return new RegExp(pattern);
}

// 한글 퍼지 문자열 검색
document.getElementById("search").addEventListener("input", function(e) {
  const query = e.target.value.replace(/ /g, "");
  const regex = createFuzzyMatcher(query);
  const st = document.getElementsByClassName("st");
  for (let i = 0; i < document.getElementById("st_body").dataset.length; i++) {
    const info = st[i].getElementsByClassName("st-id")[0].innerHTML + st[i].getElementsByClassName("st-name")[0].innerHTML;
    if (regex.test(info.toLowerCase())) st[i].style.display = "table-row";
    else st[i].style.display = "none";
  }
});

function filter() {
    for(var i = 0; i < document.getElementById("st_body").dataset.length; i++) {
        var info = st[i].getElementsByClassName("st-id")[0].innerHTML+st[i].getElementsByClassName("st-name")[0].innerHTML;
        if(info.indexOf(search) > -1){
        st[i].style.display = "table-row";
        }else{
        st[i].style.display = "none";
        }
    }
}