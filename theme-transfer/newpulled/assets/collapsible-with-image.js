(function () {
	let collapsibleWithImage = () => {
		$(".collapsible-with-image_item-wrapper").first().addClass("active");

		$(".collapsible-with-image_item-wrapper").hover(
			function () {
				$(this).addClass("active");
				$(this).siblings(".collapsible-with-image_item-wrapper").removeClass("active");
			},
			function () {
				$(this).removeClass("active");
				$(".collapsible-with-image_item-wrapper").first().addClass("active");
			}
		);
	};

	document.addEventListener("shopify:section:load", function () {
		collapsibleWithImage();
	});

	collapsibleWithImage();
})();
