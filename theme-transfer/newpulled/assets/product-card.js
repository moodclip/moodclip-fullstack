const generateSrcset = (image, widths = []) => {
	const imageUrl = new URL(image["src"]);
	return widths
		.filter((width) => width <= image["width"])
		.map((width) => {
			imageUrl.searchParams.set("width", width.toString());
			return `${imageUrl.href} ${width}w`;
		})
		.join(", ");
};

const createImageElement = (image, classes, sizes, productTitle) => {
	const previewImage = image["preview_image"];
	const newImage = new Image(previewImage["width"], previewImage["height"]);
	newImage.className = classes;
	newImage.alt = image["alt"] || productTitle;
	newImage.sizes = sizes;
	newImage.src = previewImage["src"];
	newImage.srcset = generateSrcset(
		previewImage,
		[165, 360, 533, 720, 940, 1066]
	);
	newImage.loading = "lazy";
	return newImage;
};

const checkSwatches = () => {
	document.querySelectorAll(".js-color-swatches-wrapper").forEach((wrapper) => {
		wrapper.querySelectorAll(".js-color-swatches input").forEach((input) => {
			input.addEventListener("click", (event) => {
				const primaryImage = wrapper.querySelector(".media--first");
				const secondaryImage = wrapper.querySelector(".media--second");
				const handleProduct = wrapper.dataset.product;

				if (event.currentTarget.checked && primaryImage) {
					wrapper
						.querySelector(".js-color-swatches-link")
						.setAttribute("href", event.currentTarget.dataset.variantLink);
					const currentColor = event.currentTarget.value;

					jQuery.getJSON(
						window.Shopify.routes.root + `products/${handleProduct}.js`,
						function (product) {
							const variant = product.variants.filter(
								(item) =>
									item.featured_media != null &&
									item.options.includes(currentColor)
							)[0];
							if (variant) {
								const newPrimaryImage = createImageElement(
									variant["featured_media"],
									primaryImage.className,
									primaryImage.sizes,
									product.title
								);

								if (newPrimaryImage.src !== primaryImage.src) {
									let flag = false;
									if (secondaryImage) {
										const secondaryImagePathname = new URL(secondaryImage.src)
											.pathname;
										const newPrimaryImagePathname = new URL(newPrimaryImage.src)
											.pathname;

										if (secondaryImagePathname == newPrimaryImagePathname) {
											primaryImage.remove();
											secondaryImage.classList.remove("media--second");
											secondaryImage.classList.add("media--first");
											flag = true;
										}
									}
									if (flag == false) {
										primaryImage.animate(
											{ opacity: [1, 0] },
											{ duration: 200, easing: "ease-in", fill: "forwards" }
										).finished;
										setTimeout(function () {
											primaryImage.replaceWith(newPrimaryImage);
											newPrimaryImage.animate(
												{ opacity: [0, 1] },
												{ duration: 200, easing: "ease-in" }
											);
											if (secondaryImage) {
												secondaryImage.remove();
											}
										}, 200);
									}
								}
							}
						}
					);
				}
			});
		});
	});
};

//updateMedia() {
//	if (!this.currentVariant || !this.currentVariant?.featured_media) return;

//	const newMedia = document.querySelector(
//		`[data-media-id="${this.dataset.section}-${this.currentVariant.featured_media.id}"]`
//	);

//	const parent = newMedia.parentElement;

//	const swiperWrappers = document.querySelectorAll(".product__media-wrapper, .global-variant-slider");

//	swiperWrappers.forEach((elem) => {
//		if (!this.isHidden(elem)) {
//			const newMedia = elem.querySelector(
//				`[data-media-id="${this.dataset.section}-${this.currentVariant.featured_media.id}"]`
//			);
//			const mediaList = elem.querySelector(".js-media-list, .global-variant-js-media-list");
			
//			if (mediaList) {
//				mediaList.swiper.slideTo(
//					mediaList.swiper.slides.indexOf(newMedia)
//				);
//			} else {
//				newMedia && parent.prepend(newMedia);

//				window.setTimeout(() => {
//					parent.scroll(0, 0);
//				});
//			}
//		}
//	});
//}


function colorSwatches() {
	checkSwatches();

	document.addEventListener("shopify:section:load", function () {
		checkSwatches();
	});
}

(function () {
	colorSwatches();
})();
