(function () {
	const passwordeye = () => {
		const toggleButton = document.querySelector(".field__password-type");
		const passwordInput = document.getElementById("CustomerPassword");

		toggleButton.addEventListener("click", function () {
			if (passwordInput.type === "password") {
				passwordInput.type = "text";
			} else {
				passwordInput.type = "password";
			}
		});
	};

	passwordeye();
	document.addEventListener("shopify:section:load", function () {
		passwordeye();
	});
})();
