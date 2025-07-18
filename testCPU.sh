for i in {1..5}; do
    echo "Sending CPU-bound request $i..."
    curl -s http://localhost:3000/fibonacci/45 & # '&' đưa lệnh vào nền
done
wait # Đợi tất cả các lệnh nền hoàn thành
echo "All CPU-bound requests sent."