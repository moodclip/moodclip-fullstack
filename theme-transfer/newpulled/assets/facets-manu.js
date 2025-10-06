(function () {
	const facetsMenu = () => {
		$("html.js .no_submit").click(function (e) {
			e.preventDefault();
		});
		$(
			".open_filters,.facets-menu__close,.facets__submit,.facets__reset,.form-menu__mask"
		).click(function () {
			$("#open_filters_menu").toggleClass("show_menu");
			$("body").toggleClass("overflow-hidden");
		});
	};
	//const allFIlter = document.querySelector(".type-filter__all_active");
	//const qFIlter = document.querySelector(".type-filter__label_active");

	//qFIlter.addEventListener("click", function () {
	//	allFIlter.classList.add("active_opacity");
	//});
	//allFIlter.addEventListener("click", function () {
	//	allFIlter.classList.remove("active_opacity");
	//});
	document.addEventListener("DOMContentLoaded", function () {
		facetsMenu();
	});
	document.addEventListener("shopify:section:load", function () {
		facetsMenu();
	});
})();
