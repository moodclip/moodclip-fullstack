(function () {
	const hero = () => {
		$(".hero-section").each(function () {
			const box = $(this).find(".hero");
			const cursorProgress = (slideshowSwiper) => {
				const heroImages = $(this).find(".hero_img");

				// Set initial styles for the images
				heroImages.each((index, element) => {
					$(element).css({
						"will-change": "opacity, transform",
						filter: "none",
						transform: "translate3d(0px, 0%, 0px) scale3d(1, 1, 1)",
						opacity: index === 0 ? "1" : "0",
						transition: "opacity 0.1s ease, transform 0.1s ease", // Արագ անցման տևողություն
					});
				});

				// Mousemove event for transitions
				let currentIndex = 0;

				// Mousemove event for transitions
				slideshowSwiper.addEventListener("mousemove", (e) => {
						const swiperWidth = slideshowSwiper.clientWidth;
						const cursorPosition = e.clientX - slideshowSwiper.getBoundingClientRect().left;
						const sectionWidth = swiperWidth / heroImages.length;
						const buffer = sectionWidth * 0.25; // 25% buffer on left/right sides
				
						heroImages.each((index, element) => {
								const sectionStart = sectionWidth * index + buffer;
								const sectionEnd = sectionStart + sectionWidth - 2 * buffer;
				
								if (cursorPosition >= sectionStart && cursorPosition <= sectionEnd) {
										currentIndex = index; // Update the current index based on mouse position
				
										const distanceFromStart = cursorPosition - sectionStart;
										let opacity = distanceFromStart / (sectionEnd - sectionStart);
				
										if (index === 0) {
												opacity = Math.max(0.7, opacity);
										}
				
										$(element).css({
												opacity: opacity,
												transform: `scale3d(${1 + 0.1 * opacity}, ${1 + 0.1 * opacity}, 1)`,
										});
				
										if (index > 0) {
												const prevElement = heroImages.get(index - 1);
												const prevOpacity = 1 - opacity;
				
												$(prevElement).css({
														opacity: prevOpacity,
														transform: `scale3d(${1 + 0.1 * prevOpacity}, ${1 + 0.1 * prevOpacity}, 1)`,
												});
										}
								}
						});
				});

				// Mouseleave event to reset styles
				slideshowSwiper.addEventListener("mouseleave", () => {
					heroImages.each((index, element) => {
							// Set the opacity of the currently active image
							if (index === currentIndex) {
									$(element).css({
											opacity: "1", // Keep the currently active image fully visible
											transform: "scale3d(1, 1, 1)", // Reset transformation
									});
							} else {
									$(element).css({
											opacity: "0", // Hide other images
											transform: "translate3d(0px, 0%, 0px) scale3d(1, 1, 1)", // Reset transformation
									});
							}
					});
			});
			};

			cursorProgress(this.querySelector(".hero"));
		});
	};

	document.addEventListener("DOMContentLoaded", function () {
		hero();

		document.addEventListener("shopify:section:load", function () {
			hero();
		});
	});
})();
