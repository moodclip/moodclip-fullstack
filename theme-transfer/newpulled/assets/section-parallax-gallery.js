(function () {
	"use strict";

	const parallaxGallery = () => {
		var gsap = window.gsap;
		var ScrollTrigger = window.ScrollTrigger;

		//if (!gsap || !ScrollTrigger) {
		//	console.error("GSAP или ScrollTrigger не загружены.");
		//	return;
		//}

		gsap.registerPlugin(ScrollTrigger);

		//var module = {
		//	initLoad: function () {
		//		this.initTextScrollingImages();
		//	},
		//	initTextScrollingImages: function () {
		//		var elements = document.querySelectorAll(".tsi");
		//		if (elements.length === 0) return false;

		//		elements.forEach(function (element) {
		//			gsap.timeline({
		//				scrollTrigger: {
		//					trigger: element.querySelector(".tsi__copy"),
		//					start: "center center",
		//					pin: true,
		//					pinSpacing: false,
		//					endTrigger: element,
		//					end: "bottom bottom",
		//				},
		//			});
		//		});
		//	},
		//};

		//module.initLoad();
		

		function initZoomOutAnim() {
			var elements = document.querySelectorAll(".zoomOut");
			if (elements.length === 0) return false;

			var scaleValue = window.innerWidth <= 850 ? 1.1 : 1.05;

			elements.forEach(function (element) {
				gsap.set(element, { scale: 1.25 });

				gsap.timeline({
					scrollTrigger: {
						trigger: element,
						start: "top 75%",
					},
				}).to(element, {
					scale: scaleValue,
					duration: 0.85,
					ease: "power1.inOut",
				});
			});
		}
		initZoomOutAnim();
	};

	document.addEventListener("DOMContentLoaded", function () {
		parallaxGallery();
		document.addEventListener("shopify:section:load", function () {
			parallaxGallery();
		});
	});
})();
