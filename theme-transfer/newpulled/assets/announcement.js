(function () {
	const iconClose = () => {
		const icons = document.querySelectorAll(".icon-close");
		icons.forEach((icon) => {
			icon.addEventListener("click", function () {
				const announcement = icon.closest(".section-announcement");
				if (announcement) {
					announcement.style.display = "none";
				}
			});
		});
	};

	iconClose();
	document.addEventListener("shopify:section:load", function () {
		iconClose();
	});
})();
