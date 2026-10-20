/* الصفحاتُ الثابتة (hadith/ و quran/): سمةٌ تُحفظ، وعاملُ خدمةٍ يُسجَّل.
   وهي ملفٌّ مستقلٌّ لا سطورٌ في كلّ صفحة: الصفحاتُ ثلاثةٌ وأربعون ألفًا،
   فما يُكرَّر فيها بايتًا يصير أربعين ميغابايت. وهذا يُحفظ مرّةً. */
(function () {
  var b = document.getElementById("tgl");
  if (b) b.onclick = function () {
    var c = document.documentElement.getAttribute("data-theme") || "light";
    var n = c === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", n);
    try { localStorage.setItem("turath-theme", n); } catch (e) {}
  };
  if ("serviceWorker" in navigator)
    addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); });
})();
