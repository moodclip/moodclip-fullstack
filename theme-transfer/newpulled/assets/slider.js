var sliderThumbs = new Swiper(".mySwiper", {
	// direction: 'vertical',
	direction: "horizontal",
	speed: 3000,
	effect: "cube",
	//touchRatio: 0.3,
	slideToClickedSlide: true,
	loop: true,
	loopedSlides: 1,
	slidesPerView: 1,
	navigation: {
		nextEl: ".upk-button-next",
		prevEl: ".upk-button-prev",
	},
});

var mainSlider = new Swiper(".mySwiper2", {
	parallax: true,
	effect: "cube",
	speed: 700,
	loop: true,
	loopedSlides: 1,

	slidesPerView: 1,
	pagination: {
		el: ".swiper-pagination",
		clickable: true,
	},
});

mainSlider.controller.control = sliderThumbs;
sliderThumbs.controller.control = mainSlider;
