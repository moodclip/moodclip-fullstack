(function () {
	const animatedImageCollage = () => {
		const items = document.querySelectorAll(".animated-image-collage_grid");
		gsap.fromTo(
			items,  
			{ x: "10vw" },  
			{ x: "-200vw", duration: 55, repeat: -1, ease: "linear" } 
		);

};
document.addEventListener("DOMContentLoaded", function () {
	animatedImageCollage();
	document.addEventListener("shopify:section:load", function () {
		animatedImageCollage();
	});
});
})();