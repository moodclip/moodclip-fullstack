(function () {
	const searchModal = () => {
		$(".search-modal-trigger,.search-modal__overlay,.search__close").click(
			function (e) {
				e.preventDefault();
				searchToggle();
			}
		);
	};
	$(document).on("keyup", function (e) {
		if ($(".search-modal").hasClass("active") && e.key == "Escape") {
			searchToggle();
		}
	});
	function searchToggle() {
		$("#search-modal").toggleClass("active");
		$(".header-overlay").toggleClass("color-background-1");
		if ($("#search-modal").hasClass("active")) {
			$("#search-modal").find(".search__input").focus();
			$(".header-overlay").addClass("color-background-1");
		} else {
			$(".search-modal-trigger").focus();
		}
		$("body").toggleClass("overflow-hidden");
	}
	document.addEventListener("shopify:section:load", searchModal);
	searchModal();
})();
