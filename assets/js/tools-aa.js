let record = {
    amount: 0,
    members: 0,
    groups: {},
};
let resultText;

const copyToClipboard = function (text) {
    const input = document.createElement("input");
    input.style.position = "fixed";
    input.style.opacity = 0;
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("Copy", false, null);
    document.body.removeChild(input);
    showToast("结算结果已复制到粘贴板");
};

const copyResult = function (event) {
    if (resultText === undefined) {
        return;
    }

    copyToClipboard(resultText);
}

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

const addGroup = function (event) {
    checkForm(event, 'form-add-group', function () {
        const leader = $("#input-leader").val();
        const members = parseInt($("#input-members").val());
        const prepayments = parseFloat($("#input-prepayments").val());

        if (record.groups.hasOwnProperty(leader)) {
            showToast("领队已存在");
            return;
        }

        record.groups[leader] = {
            leader: leader,
            members: members,
            prepayments: prepayments,
        };
        record.members += members;

        const html = `<li class="list-group-item">
                <div class="d-flex w-100 justify-content-between">
                    <span>` + leader + `&nbsp;<small>` + members + `人次</small>&nbsp;<small>预付` + prepayments + `元</small></span>
                    <span>
                        <svg data-leader="` + leader + `" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-dash btn-outline-danger bi-remove-group" viewBox="0 0 16 16">
                            <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H1s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C9.516 10.68 8.289 10 6 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                            <path fill-rule="evenodd" d="M11 7.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5z"/>
                        </svg>
                    </span>
                </div>
            </li>`;

        $("#groups").append(html);
    });
}

const removeGroup = function (event) {
    const target = $(event.currentTarget);
    const leader = target.data('leader');
    record.members -= record.groups[leader].members;
    delete record.groups[leader];

    const item = target.closest('.list-group-item');
    item.detach();
}

const countResult = function (event) {
    checkForm(event, 'form-count-group', function () {
        var lines = [];
        const results = $("#results");
        results.html("");

        record.amount = parseFloat($("#input-amount").val());
        const eachMember = (record.amount / record.members).toFixed(2);
        const html = `<li class="list-group-item text-info">
                <span class="list-title text-break">人均&nbsp;<strong>` + eachMember + `</strong>&nbsp;元</span>
            </li>`;
        results.append(html);

        lines.push("人均" + eachMember + "元");

        Object.keys(record.groups).forEach(function (leader) {
            const group = record.groups[leader];
            const diff = (eachMember * group.members) - group.prepayments;
            const html = `<li class="list-group-item text-` + (diff < 0 ? 'success' : 'danger') + `">
                <span class="list-title text-break">` + leader + `&nbsp;<strong>` + (diff < 0 ? '可得退款' : '需要补缴') + `</strong>&nbsp;<small>` + Math.abs(diff) + `元</span>
            </li>`;

            results.append(html);
            lines.push(leader + (diff < 0 ? '可得退款 ' : '需要补缴 ') + Math.abs(diff) + "元");
        });

        resultText = lines.join(";\n");
        copyToClipboard(resultText);
    });
}

const showToast = function (message) {
    const toast = $('#toast');
    $('#toast > .toast-body').text(message);
    let toastInstance = new bootstrap.Toast(toast[0], { delay: 1800 });
    toastInstance.show();
}

$(document).ready(function () {
    $(document).on("click", ".bi-remove-group" , removeGroup);
    $(document).on("click", "#btn-count" , countResult);
    $(document).on("click", "#btn-add" , addGroup);
    $(document).on("click", "#btn-copy" , copyResult);
});