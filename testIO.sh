for i in {1..5}; do
    echo "Sending I/O request $i..."
    curl -s http://localhost:3000/ & # '&' đưa lệnh vào nền
done
wait # Đợi tất cả các lệnh nền hoàn thành
echo "All I/O requests sent."