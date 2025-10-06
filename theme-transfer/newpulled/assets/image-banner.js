(function () {
	let imageBanner = () => {
		$(".image-banner__heading").hover(function () {
			$(this).addClass("active");
			$(this).siblings(".image-banner__heading").removeClass("active");
		});
	};

	document.addEventListener("shopify:section:load", function () {
		imageBanner();
	});

	imageBanner();
})();
