var vars = {};
var stack = [];
var photos = [];
var titles = [];
var photoID;
var titleID;
var lastAudio;

function $(id) {
    return document.getElementById(id);
}

function play(id) {
    lastAudio = id;
    $("source").setAttribute("src", "audio/"+id+".mp3");
    $("audio").load();
    $("audio").play();
}

function click(type, id) {
    console.log("click", type, id);
    if(type == "question" || type == "answer") {
        if(!$("audio").paused && id == lastAudio) {
            if(type=="answer") { choose(id); }
            else $("audio").pause();
        } else {
            play(id);
        }
    } else {
        choose(id);
    }
}

function setText(div, text) {
    while (div.hasChildNodes()) {
        div.removeChild(div.lastChild);
    }
    for (var e in text.split("\n")) {
        if (text.split("\n")[e].length) {
            div.appendChild(document.createTextNode(text.split("\n")[e]));
            div.appendChild(document.createElement("br"));
        }
    }
}

function addText(node, id, additionalClass) {
    if (!nodes[id].text.length) {
        return;
    }
    var div = document.createElement("div");
    var type = nodes[id].type;
    if(additionalClass == "choice") {
        // Compiled graph representation discards explicit prompt/choice typing
        /**/ if(type == "description") type = "action";
        else  if(type == "question") type = "answer";
    } else { // prompt
        play(id);
    }
    div.onclick = function() { click(type,id); };
    if (type != "description" && type != "action" && type != "question" && type != "answer") {
        type = "debug";
    }
    div.setAttribute("class", type + " " + additionalClass);
    div.setAttribute("title", nodes[id].help);
    setText(div, nodes[id].text);
    $(node).appendChild(div);
}

function evaluate(node) {
    var choices = [];
    for (var i = 0;i < node.next.length;i++) {
        var id = node.next[i];
        var next = nodes[id];
        if (next.type == "==") {
            var params = nodes[id].text.split("==");
            if ((vars[params[0]] || 0) == params[1] ) {
                choices = choices.concat(evaluate(next));
            }
        } else {
            choices.push(id);
        }
    }
    return choices;
}

function displayChoices(choices) {
    for (var i = 0;i < choices.length;i++) {
        addText("choice", choices[i], "choice");
    }
}

function goto(id) {
    var node = nodes[id];
    if (node.type == "call" && node.next.length) {
        stack.push(id);
        photos.push(photoID);
        titles.push(titleID);
        goto(node.text);
        return;
    }
    gotoNoCall(id);
}

function gotoNoCall(id) {
    var node = nodes[id];
    var params = "";
    for (var i = 0;i < stack.length;i++) {
        params += stack[i] + "," + photos[i] + "," + titles[i] + ";";
    }
    params += id;
    for (var key in vars) {
        if (vars.hasOwnProperty(key)) {
            params += ";" + key + "=" + vars[key];
        }
    }
    location.hash = "#" + params;

    if (node.type == "title") {
        titleID = id;
        setText($("title"), document.title = nodes[id].text);
    } else if (node.type == "photo") {
        photoID = id;
        $("photo").setAttribute("src", "photo/" + nodes[id].text);
    } else if (node.type == "=") {
        var assign = nodes[id].text.split("=");
        vars[assign[0]] = assign[1];
    }
    addText("last", id);
    var choices = evaluate(node);
    if (!choices.length) {
    if (stack.length) {
        $("photo").setAttribute("src", "photo/" + nodes[photos.pop()].text);
        setText($("title"), document.title = nodes[titles.pop()].text);
        gotoNoCall(stack.pop());
    }
    } else if (choices.length == 1) {
        goto(choices[0]);
    } else {
        displayChoices(choices);
    }
}

function choose(id) {
    while ($("last").hasChildNodes()) {
        $("log").appendChild($("last").firstChild);
    }
    while ($("choice").hasChildNodes()) {
        $("choice").removeChild($("choice").lastChild);
    }
    goto(id);
}

window.onload = function load() {
    var params = location.hash.slice(1).split(";");
    var i = 0;
    if (params[0].length) {
        for (;;i++) {
            var e = params[i].split(",");
            stack.push(e[0]);
            if (e.length == 1) {
                break;
            }
            photos.push(e[1]);
            titles.push(e[2]);
        }
    }
    for (;i < params.length;i++) {
        if (params[i].length) {
            var val = params[i].split("=");
            if (val.length) {
                vars[val[0]] = val[1];
            }
        }
    }
    if (!stack.length) {
        goto(nodes[start].next[0]);
    } else {
        goto(stack.pop());
    }
}
