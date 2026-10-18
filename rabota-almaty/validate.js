// Клиентская валидация (чистые функции; те же правила дублируются на сервере в app/validation.py)
(function (root) {
  var PHONE = /^\+?[0-9][0-9\s\-()]{6,18}$/;
  var TG = /^@[A-Za-z][A-Za-z0-9_]{4,31}$/;
  var WA = /^(https?:\/\/)?(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|t\.me)\/\S+$/i;
  var URLRE = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i;

  function digits(s) { return (s || "").replace(/\D/g, ""); }

  function validate(d, cfg) {
    var e = {};
    var max = (cfg && cfg.DESC_MAX) || 600;
    var t = (d.title || "").trim(), c = (d.company || "").trim();
    if (t.length < 3) e.title = "Укажите должность (от 3 символов)";
    if (c.length < 2) e.company = "Укажите компанию";
    if (d.salary_mode === "negotiable") {
      // ok
    } else {
      var f = parseInt(digits(d.salary_from), 10), to = parseInt(digits(d.salary_to), 10);
      if (!f && !to) e.salary = "Укажите зарплату или «по договорённости»";
      else if (f && to && f > to) e.salary = "«От» не может быть больше «до»";
      else if ((f && f < 1000) || (to && to < 1000)) e.salary = "Сумма указана в тенге, минимум 1 000";
      else if ((f && f > 10000000) || (to && to > 10000000)) e.salary = "Слишком большая сумма";
    }
    if ((d.schedule || "").trim().length < 2) e.schedule = "Укажите график";
    if (!d.district) e.district = "Выберите район";
    var desc = (d.description || "").trim();
    if (desc.length < 20) e.description = "Опишите обязанности (минимум 20 символов)";
    else if (desc.length > max) e.description = "Не более " + max + " символов";
    var ct = (d.contact || "").trim();
    if (!ct) e.contact = "Укажите контакт";
    else if (!(PHONE.test(ct) && digits(ct).length >= 10 && digits(ct).length <= 15) && !TG.test(ct) && !WA.test(ct))
      e.contact = "Телефон (+7…), @username или ссылка WhatsApp";
    var w = (d.website || "").trim();
    if (!w) e.website = "Укажите сайт или соцсеть компании";
    else if (!URLRE.test(w)) e.website = "Ссылка должна начинаться с https://";
    if (!d.agree || !d.noprepay) e.agree = "Нужно отметить оба пункта";
    return e;
  }

  var api = { validate: validate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Validate = api;
})(typeof window !== "undefined" ? window : this);
