export default function BannerSlider() {
  return (
    <div
      id="carouselExampleIndicators"
      className="carousel slide"
      data-bs-ride="carousel"
      data-bs-interval="3000"
    >
      <div className="carousel-indicators">
        <button
          type="button"
          data-bs-target="#carouselExampleIndicators"
          data-bs-slide-to="0"
          className="active"
        ></button>
        <button
          type="button"
          data-bs-target="#carouselExampleIndicators"
          data-bs-slide-to="1"
        ></button>
        <button
          type="button"
          data-bs-target="#carouselExampleIndicators"
          data-bs-slide-to="2"
        ></button>
      </div>

      <div className="carousel-inner">
        <div className="carousel-item active">
          <img
            src="/dist/img/banner/slide-01.jpg"
            className="d-block w-100"
            alt="slide 1"
          />
        </div>

        <div className="carousel-item">
          <img
            src="/dist/img/banner/slide-02.jpg"
            className="d-block w-100"
            alt="slide 2"
          />
        </div>

        <div className="carousel-item">
          <img
            src="/dist/img/banner/slide-03.jpg"
            className="d-block w-100"
            alt="slide 3"
          />
        </div>
      </div>

      {/* ===== NÚT PREVIOUS ===== */}
      <button
        className="carousel-control-prev"
        type="button"
        data-bs-target="#carouselExampleIndicators"
        data-bs-slide="prev"
      >
        <span className="carousel-control-prev-icon"></span>
      </button>
      {/* ===== NÚT NEXT ===== */}
      <button
        className="carousel-control-next"
        type="button"
        data-bs-target="#carouselExampleIndicators"
        data-bs-slide="next"
      >
        <span className="carousel-control-next-icon"></span>
      </button>
    </div>
  );
}
