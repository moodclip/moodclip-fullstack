(function () {
	const tickerInto = () => {
		$(".intro-banner").each(function () {
			if ($(this).hasClass("slider_started")) {
				return "";
			}
			$(this).addClass("slider_started");
			const tickerId = $(this).data("intro-ticker-id");
			//const tickerSpeed = $(this).data("ticker-speed") * 1000;
			$(`.ticker-js-${tickerId}`).marquee({
				duration: 10000,
				gap: 0,
				delayBeforeStart: 0,
				direction: "left",
				duplicated: true,
				startVisible: true,
			});
			//.on("mouseenter", function () {
			//	$(this).marquee("pause");
			//})
			//.on("mouseleave", function () {
			//	$(this).marquee("resume");
			//});
		});
	};

	tickerInto();
	document.addEventListener("shopify:section:load", function () {
		setTimeout(() => {
			tickerInto();
		});
	});

	document.addEventListener("visibilitychange", function () {
		if (!document.hidden) {
			$(".ticker-js").each(function () {
				$(this).marquee("destroy");
			});
			tickerInto();
		}
	});

	setTimeout(() => {
		tickerInto();
	});
})();


//document.addEventListener("DOMContentLoaded", function() {
//	const introEl = document.querySelector('.intro-banner-section');

//	gsap.registerPlugin(ScrollTrigger);

//	gsap.timeline({
//		scrollTrigger: {
//			trigger: introEl,
//			start: "top top",
//			end: "bottom top",
//			scrub: 1,
//			//pin: true,
//			onEnter: () => introEl.classList.add("active"),
//			onLeave: () => introEl.classList.remove("active"),
//			onComplete: () => {
//				document.body.classList.remove("page-introduction");
//			}
//		}
//	})
//	.to(introEl, {
//		yPercent: -100,
//		ease: "none"
//	});
//});