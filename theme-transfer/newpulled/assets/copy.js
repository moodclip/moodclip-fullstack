function copyURI(evt) {
	evt.preventDefault();
	navigator.clipboard.writeText(evt.target.href || window.location.href).then(() => {
			const parentElement = evt.target.closest('.copy-wrapper');
			const tooltip = parentElement.querySelector('.tooltip');

			if (tooltip) {
					tooltip.classList.add("show");

					setTimeout(() => {
							tooltip.classList.remove("show");
					}, 2000);
			}
	}).catch(err => {
			console.error('Error: ', err);
	});
}

document.addEventListener('DOMContentLoaded', () => {
	const copyLinks = document.querySelectorAll('.copy-btn');

	for (const copyLink of copyLinks) {
			copyLink.addEventListener('click', copyURI);
	}
});
