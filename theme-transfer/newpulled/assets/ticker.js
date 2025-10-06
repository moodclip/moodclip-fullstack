(function () {
	const ticker = () => {
		$(".ticker").each(function () {
			if ($(this).hasClass("slider_started")) {
				return "";
			}
			$(this).addClass("slider_started");
			const tickerId = $(this).data("ticker-id");
			const tickerSpeed = $(this).data("ticker-speed") * 1000;

			const wrapper = $(`.ticker-js-${tickerId}`);
			let totalWidth = 0;
			wrapper.children().each(function () {
				totalWidth += $(this).outerWidth(true);
			});

			$(`.ticker-js-${tickerId}`)
				.marquee({
					duration: tickerSpeed,
					gap: 0,
					delayBeforeStart: 0,
					direction: "left",
					duplicated: true,
					startVisible: true,
				})
				.on("mouseenter", function () {
					$(this).marquee("pause");
				})
				.on("mouseleave", function () {
					$(this).marquee("resume");
				});
			wrapper.find(".js-marquee").css("width", totalWidth + "px");
		});
	};

	ticker();
	document.addEventListener("shopify:section:load", function () {
		setTimeout(() => {
			ticker();
		}, 100);
	});

	document.addEventListener("visibilitychange", function () {
		if (!document.hidden) {
			$(".ticker-js").each(function () {
				$(this).marquee("destroy");
			});
			ticker();
		}
	});

	setTimeout(() => {
		ticker();
	}, 100);
})();
