(function () {
	const productsPerRow = () => {
		$(".per-row__button").click(function () {
			$(".per-row__button").removeClass("active");
			$(`[data-per-row="${$(this).data("per-row")}"]`).addClass("active");
			$('[data-productis-in-row]').attr(
				"data-productis-in-row",
				$(this).data("per-row")
			);
		});
	};

	document.addEventListener("shopify:section:load", function () {
		productsPerRow();
	});
	productsPerRow();
})();
