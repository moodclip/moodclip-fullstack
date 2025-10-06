(function () {
	const tickerPopup = () => {
		$(".popup-main").each(function () {
			if ($(this).hasClass("slider_started")) {
				return "";
			}
			$(this).addClass("slider_started");
			const tickerId = $(this).data("intro-ticker-id");
			$(`.ticker-js-${tickerId}`).marquee({
				duration: 10000,
				gap: 0,
				delayBeforeStart: 0,
				direction: "left",
				duplicated: true,
				startVisible: true,
			});
		});
	};

	tickerPopup();
	document.addEventListener("shopify:section:load", function () {
		setTimeout(() => {
			tickerPopup();
		});
	});

	document.addEventListener("visibilitychange", function () {
		if (!document.hidden) {
			$(".ticker-js").each(function () {
				$(this).marquee("destroy");
			});
			tickerPopup();
		}
	});

	setTimeout(() => {
		tickerPopup();
	});
})();
