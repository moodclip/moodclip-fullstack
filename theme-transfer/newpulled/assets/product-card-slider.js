(function () {
	const initSlider = () => {
		const slider = document.querySelector(".swiper-container");
		if (!slider || slider.classList.contains("slider_started")) {
			return;
		}
		slider.classList.add("slider_started");
		var swiper = new Swiper(".swiper-container", {
			slidesPerView: 1,
			speed: 250,
			spaceBetween: 0,
			navigation: {
				nextEl: ".product-button-group .swiper-button-next-1",
				prevEl: ".product-button-group .swiper-button-prev-1",
			},
			pagination: {
				el: " .product-card-pagination",
				clickable: true,
			},
		});
	};
	initSlider();
	document.addEventListener("shopify:section:load", function () {
		initSlider();
		document.addEventListener("shopify:section:load", function () {
			initSlider();
		});
	});
})();
