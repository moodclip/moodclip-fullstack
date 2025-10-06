(function () {
	const startTicker = () => {
		$(".brands-section").each(function () {
			const $ticker = $(this).find(".brands-items");
			const tickerWidth = $ticker.width();
			if ($(this).hasClass("slider_started")) {
				return "";
			}
			$(this).addClass("slider_started");
			$ticker.append($ticker.html());
			function animateTicker() {
				$ticker.css({
					transform: "translateX(0)",
					transition: "none",
				});

				setTimeout(() => {
					const totalWidth = $ticker.width();
					const duration =
						(totalWidth / tickerWidth) * $(this).data("brands-speed");

					$ticker.css({
						transform: `translateX(-150%)`,
						transition: `transform ${duration}ms linear`,
					});
				}, 100);

				$ticker.one("transitionend", () => {
					$ticker.css({
						transform: "translateX(0)",
						transition: "none",
					});

					animateTicker();
				});
			}
			animateTicker();
		});
	};

	startTicker();
	document.addEventListener("shopify:section:load", function () {
		startTicker();
	});
})();