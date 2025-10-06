(function () {
	const contactModal = () => {
		const toggleButton = document.querySelector(".steps_content_button");
		toggleButton.addEventListener("click", function () {
			const modal = document.querySelector(".contact-modal");
			modal.classList.add("active");
			document.body.classList.add("overflow-hidden");
		});
		const modalOverlay = document.querySelector(".modal__overlay");
		modalOverlay.addEventListener("click", function () {
			const modal = document.querySelector(".contact-modal");
			modal.classList.remove("active");
			document.body.classList.remove("overflow-hidden");
		});
		const modalclose = document.querySelector(".close_modal_element");
		modalclose.addEventListener("click", function () {
			const modal = document.querySelector(".contact-modal");
			modal.classList.remove("active");
			document.body.classList.remove("overflow-hidden");
		});
		document.addEventListener("keyup", (e) => {
			if (e.key === "Escape") {
				const modal = document.querySelector(".contact-modal");
				modal.classList.remove("active");
				document.body.classList.remove("overflow-hidden");
			}
		});
	};
	document.addEventListener("DOMContentLoaded", function () {
		contactModal();
		document.addEventListener("shopify:section:load", function () {
			contactModal();
		});
	});
})();
