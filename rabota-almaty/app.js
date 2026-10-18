(function () {
  var tg = window.Telegram && Telegram.WebApp;
  var C = window.APP_CONFIG;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") + "\u00a0" + C.CURRENCY; };
  if (tg) { tg.ready(); tg.expand(); try { tg.setHeaderColor("secondary_bg_color"); } catch (e) {} }

  var form = $("#form");
  // Запуск из меню/инлайн-кнопки: sendData там не работает (только из reply-клавиатуры) → отправляем в чат бота.
  var viaMenu = !!(tg && tg.initDataUnsafe && tg.initDataUnsafe.query_id);
  if (viaMenu) {
    form.classList.remove("active"); $("#menuNotice").classList.add("active");
    document.querySelector('[data-tab=form]').dataset.tab = "menuNotice";
    $("#toBot").addEventListener("click", function () {
      var link = "https://t.me/" + C.BOT_USERNAME + "?start=form";
      if (tg.openTelegramLink) tg.openTelegramLink(link); else window.open(link);
      setTimeout(function () { tg.close(); }, 300);
    });
  }
  $("#max").textContent = C.DESC_MAX;
  $("#promo").textContent = C.PAYMENTS_ENABLED ? "Размещение вакансий в канале" : "Запуск: размещение бесплатно, оплата позже";

  // районы
  var sel = form.district;
  sel.innerHTML = '<option value="">Выберите…</option>' + C.DISTRICTS.map(function (d) { return "<option>" + d + "</option>"; }).join("");

  // тарифы
  var tbox = $("#tariffs");
  tbox.innerHTML = C.TARIFFS.map(function (t, i) {
    var price = C.PAYMENTS_ENABLED ? "<span class='p'>" + fmt(t.price) + "</span>" : "<span class='p'><s>" + fmt(t.price) + "</s>бесплатно</span>";
    return "<label class='tariff" + (i === 0 ? " sel" : "") + "'><input type='radio' name='tariff' value='" + t.id + "'" + (i === 0 ? " checked" : "") + "><div><b>" + t.title + "</b><small>" + t.note + "</small></div>" + price + "</label>";
  }).join("");
  $("#urgentText").textContent = "Срочно 🔥 (+" + fmt(C.URGENT_EXTRA) + (C.PAYMENTS_ENABLED ? "" : ", пока бесплатно") + ")";

  function tariff() { return C.TARIFFS.filter(function (t) { return t.id === form.tariff.value; })[0] || C.TARIFFS[0]; }
  function updateSum() {
    Array.prototype.forEach.call(tbox.children, function (l) { l.classList.toggle("sel", l.querySelector("input").checked); });
    var t = tariff(), total = t.price + (form.urgent.checked ? C.URGENT_EXTRA : 0);
    $("#sum").innerHTML = C.PAYMENTS_ENABLED ? "Итого: <strong>" + fmt(total) + "</strong>" : "К оплате сейчас: <strong>0 " + C.CURRENCY + "</strong> (запуск, оплата позже)";
  }
  tbox.addEventListener("change", updateSum); form.urgent.addEventListener("change", updateSum); updateSum();

  // зарплата
  function salaryMode() { return form.salary_mode.value; }
  form.addEventListener("change", function (e) {
    if (e.target.name === "salary_mode") $("#salaryRange").style.display = salaryMode() === "negotiable" ? "none" : "flex";
  });
  ["salary_from", "salary_to"].forEach(function (n) {
    form[n].addEventListener("input", function () { var d = form[n].value.replace(/\D/g, ""); form[n].value = d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : ""; });
  });

  // счётчик
  form.description.addEventListener("input", function () { $("#cnt").textContent = form.description.value.length; });

  // вкладки
  document.querySelectorAll(".tab").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (x) { x.classList.toggle("active", x === b); });
      document.querySelectorAll(".tabpane").forEach(function (p) { p.classList.toggle("active", p.id === b.dataset.tab); });
      window.scrollTo(0, 0);
    });
  });

  // правила и цены
  $("#priceList").innerHTML = C.TARIFFS.map(function (t) {
    return "<div class='tariff'><div><b>" + t.title + "</b><small>" + t.note + "</small></div><span class='p'>" + fmt(t.price) + "</span></div>";
  }).join("") + "<div class='tariff'><div><b>Срочно 🔥</b><small>приоритет в очереди, опция</small></div><span class='p'>+" + fmt(C.URGENT_EXTRA) + "</span></div>";
  $("#priceNote").textContent = C.PAYMENTS_ENABLED ? "Оплата после одобрения вакансии." : "Сейчас — запуск: размещение бесплатно, оплата включится позже.";

  function collect() {
    return {
      title: form.elements.title.value.trim(), company: form.company.value.trim(),
      salary_mode: salaryMode(), salary_from: form.salary_from.value, salary_to: form.salary_to.value,
      schedule: form.schedule.value.trim(), district: form.district.value,
      description: form.description.value.trim(), contact: form.contact.value.trim(), website: form.website.value.trim(),
      tariff: form.tariff.value, urgent: form.urgent.checked, agree: form.agree.checked, noprepay: form.noprepay.checked
    };
  }
  function show(errs) {
    document.querySelectorAll(".field").forEach(function (f) {
      var m = errs[f.dataset.f]; f.classList.toggle("bad", !!m); var el = f.querySelector(".err"); if (el) el.textContent = m || "";
    });
  }
  form.addEventListener("input", function () { if (form.dataset.tried) show(Validate.validate(collect(), C)); });
  form.addEventListener("change", function () { if (form.dataset.tried) show(Validate.validate(collect(), C)); });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault(); form.dataset.tried = "1";
    var d = collect(), errs = Validate.validate(d, C); show(errs);
    var keys = Object.keys(errs);
    if (keys.length) {
      var el = document.querySelector("[data-f=" + keys[0] + "]"); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("error");
      return;
    }
    var f = parseInt(d.salary_from.replace(/\D/g, ""), 10) || 0, t = parseInt(d.salary_to.replace(/\D/g, ""), 10) || 0;
    var payload = {
      v: 1, title: d.title, company: d.company,
      salary: d.salary_mode === "negotiable" ? { mode: "negotiable" } : { mode: "range", from: f || null, to: t || null },
      schedule: d.schedule, district: d.district, description: d.description, contact: d.contact, website: d.website,
      tariff: d.tariff, urgent: d.urgent, agree: true, noprepay: true, payments_enabled: !!C.PAYMENTS_ENABLED
    };
    var json = JSON.stringify(payload);
    if (tg && tg.sendData) { tg.sendData(json); }
    else { alert("Откройте форму из Telegram (кнопка «Разместить вакансию» в боте)."); console.log(json); }
  });
})();
