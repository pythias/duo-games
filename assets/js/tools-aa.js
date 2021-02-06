let record = {
    amount: 0,
    members: 0,
    groups: {},
};
let resultText;
let inputChanged;

const copyToClipboard = function (text) {
    const input = document.createElement("textarea");
    input.style.position = "fixed";
    input.style.opacity = 0;
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("Copy", false, null);
    document.body.removeChild(input);
    showToast("结算结果已复制到粘贴板");
};

const checkForm = function (event, id, callback) {
    const form = document.getElementById(id);
    if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
    } else {
        callback();
    }

    form.classList.add('was-validated');
}

const fixed = function (v) {
    return parseFloat((v / 10000).toFixed(2));
}

const round = function (v) {
    return parseInt(v.toFixed(0));
}
const showToast = function (message) {
    const toast = $('#toast');
    $('#toast > .toast-body').text(message);
    let toastInstance = new bootstrap.Toast(toast[0], { delay: 1800 });
    toastInstance.show();
}

const onCopyClick = function (event) {
    if (resultText === undefined) {
        return;
    }

    copyToClipboard(resultText);
}

const onAddClick = function (event) {
    inputChanged = false;
    checkForm(event, 'form-add-group', function () {
        const leader = $("#input-leader").val();
        const members = parseInt($("#input-members").val());
        const prepayments = parseInt(parseFloat($("#input-prepayments").val()) * 10000);

        if (record.groups.hasOwnProperty(leader)) {
            showToast("领队已存在");
            return;
        }

        record.groups[leader] = {
            leader: leader,
            members: members,
            prepayments: prepayments,
            diff: 0,
        };
        record.amount += prepayments;
        record.members += members;

        const html = `<li class="list-group-item">
                <div class="d-flex w-100 justify-content-between">
                    <span>` + leader + `&nbsp;<small>` + members + `人次</small>&nbsp;<small>预付` + fixed(prepayments) + `元</small></span>
                    <span>
                        <svg data-leader="` + leader + `" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-dash btn-outline-danger bi-remove-group" viewBox="0 0 16 16">
                            <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H1s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C9.516 10.68 8.289 10 6 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                            <path fill-rule="evenodd" d="M11 7.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5z"/>
                        </svg>
                    </span>
                </div>
            </li>`;

        $("#groups").append(html);
        $("#info-amount").html('总金额 ' + fixed(record.amount) + ' 元，总人数 ' + record.members);
        $("#info-each").html('人均 ' + fixed(record.amount / record.members) + ' 元');
        $("#results").html('');
        $("#input-leader").focus();
        inputChanged = false;
    });
}

const onRemoveGroupClick = function (event) {
    const target = $(event.currentTarget);
    const leader = target.data('leader');
    record.members -= record.groups[leader].members;
    record.amount -= record.groups[leader].prepayments;

    delete record.groups[leader];

    const item = target.closest('.list-group-item');
    item.detach();

    $("#info-amount").html('总金额 ' + fixed(record.amount) + ' 元，总人数 ' + record.members);
    $("#info-each").html('人均 ' + fixed(record.amount / record.members) + ' 元');
    $("#results").html('');
}

const onCountClick = function (event) {
    if (inputChanged) {
        if (!confirm("有团队未添加，是否继续计算?")) {
            event.preventDefault();
            return;
        }
    }
    
    inputChanged = false;

    var lines = [];
    const eachMember = round(record.amount / record.members);
    const resultContainer = $("#results");
    resultContainer.html("");

    //计算和排序
    Object.keys(record.groups).forEach(function (leader) {
        const group = record.groups[leader];
        group.diff = group.prepayments - (eachMember * group.members);
    });
    var sortedGroups = Object.keys(record.groups).map(function (leader) {
        return [leader, record.groups[leader].diff];
    });
    sortedGroups.sort(function (first, second) {
        return second[1] - first[1];
    });

    //分成两组
    var positiveGroups = [];
    var negativeGroups = [];
    var zeroGroups = [];
    for (let index = 0; index < sortedGroups.length; index++) {
        const leader = sortedGroups[index][0];
        const diff = sortedGroups[index][1];
        if (diff > 0) {
            positiveGroups.push(leader);
        } else if (diff < 0) {
            negativeGroups.push(leader);
        } else {
            zeroGroups.push(leader);
        }
    }

    var diffs = [];
    for (let pi = 0; pi < positiveGroups.length; pi++) {
        const pg = record.groups[positiveGroups[pi]];
        for (let ni = negativeGroups.length - 1; ni >= 0; ni--) {
            const ng = record.groups[negativeGroups[ni]];
            if (ng.diff == 0) {
                continue;
            }

            const newDiff = pg.diff + ng.diff;
            if (newDiff >= 0) {
                diffs.push({ from: ng.leader, to: pg.leader, amount: Math.abs(ng.diff) });
                pg.diff += ng.diff;
                ng.diff = 0;
            } else {
                diffs.push({ from: ng.leader, to: pg.leader, amount: pg.diff });
                ng.diff += pg.diff;
                pg.diff = 0;
            }

            if (pg.diff == 0) {
                break;
            }
        }
    }

    diffs.forEach(function (d) {
        const html = '<li class="list-group-item text-info"><span class="list-title">&nbsp;' + d.from + '&nbsp;付给&nbsp;' + d.to + '&nbsp;<strong>' + fixed(d.amount) + '</strong>元</span></li>';
        resultContainer.append(html);
        lines.push(d.from + ' 付给 ' + d.to + ' ' + fixed(d.amount) + ' 元');
    });

    zeroGroups.forEach(function (v) {
        const html = '<li class="list-group-item text-info"><span class="list-title">&nbsp;' + v[0] + '&nbsp;正好</span></li>';
        resultContainer.append(html);
        lines.push(v[0] + ' 正好');
    });

    resultText = lines.join(" \n");
    copyToClipboard(resultText);
}

const onResetClick = function (event) {
    if (!confirm("确认要清空所有数据么?")) {
        event.preventDefault();
        return;
    }

    record = {
        amount: 0,
        members: 0,
        groups: {},
    };

    $("#info-amount").html('');
    $("#info-each").html('');
    $("#results").html('');
    $("#groups").html('');

    $("#input-leader").val('');
    $("#input-members").val('');
    $("#input-prepayments").val('');
    $('#form-add-group').removeClass('was-validated');
}

const onInputChanged = function (event) {
    inputChanged = true;
}

const onKeyPressed = function (event) {
    if (event.which == 13) {
        $(event.target).parent().next().find('input').focus();
        if ($(event.target)[0].id == 'input-prepayments') {
            $('#btn-add').click();
        }
    }
}

$(document).ready(function () {
    $(document).on("click", ".bi-remove-group", onRemoveGroupClick);
    $(document).on("click", "#btn-count", onCountClick);
    $(document).on("click", "#btn-add", onAddClick);
    $(document).on("click", "#btn-reset", onResetClick);
    $(document).on("click", "#btn-copy", onCopyClick);
    $(document).on("change", ".input-group:has(input:input) input:input", onInputChanged);
    $(document).on("keypress", ".input-group:has(input:input) input:input", onKeyPressed);
});