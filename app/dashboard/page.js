export default function DashboardPage() {
    return (
        <div className="dashboard-container">
            <h1>📊 Dashboard</h1>
            <div className="dashboard-stats">
                <div className="stat-card">
                    <h3>Tổng đơn bảo hành</h3>
                    <p className="stat-number">156</p>
                </div>
                <div className="stat-card">
                    <h3>Đang xử lý</h3>
                    <p className="stat-number">23</p>
                </div>
                <div className="stat-card">
                    <h3>Hoàn thành</h3>
                    <p className="stat-number">98</p>
                </div>
                <div className="stat-card">
                    <h3>Chờ duyệt</h3>
                    <p className="stat-number">35</p>
                </div>
            </div>
            {/* Bạn có thể thêm biểu đồ hoặc bảng thống kê ở đây */}
        </div>
    );
}