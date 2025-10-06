(function () {
	const checkBackground = () => {
		const contactSections = document.querySelectorAll(".contact-section");
		console.log(contactSections);
		const footer = document.querySelector(".footer");
			if (footer.classList.contains("color-background-1")) {
				contactSections.forEach((section) => {
					section.classList.add("no-padding");
				});
			}
	};

	document.addEventListener("shopify:section:load", function () {
		checkBackground();
	});

	checkBackground();
})();