export const pythonFundamentals = {
  courseTitle: "Nhập môn lập trình Python",
  chapterTitle: "Cơ sở lập trình",
  lessonTitle: "Ngôn ngữ Python cơ bản",
  title: "Python Fundamentals",
  textContent: `# Python Fundamentals

Tài liệu này giới thiệu cách biểu diễn dữ liệu và điều khiển quá trình tính toán trong Python. Mục tiêu là đọc được một chương trình nhỏ, giải thích trạng thái của nó sau từng câu lệnh và xây dựng lời giải có thể kiểm tra được. Người học nên chạy từng ví dụ trong một môi trường Python riêng, dự đoán kết quả trước khi chạy và so sánh dự đoán với đầu ra thực tế. Các ví dụ tập trung vào ý nghĩa của chương trình, không yêu cầu kiến thức về thư viện ngoài hoặc hệ điều hành.

## Variables and assignment

Python xử lý dữ liệu dưới dạng đối tượng. Một đối tượng có kiểu, giá trị và định danh; tên biến là cách để chương trình tham chiếu đến đối tượng đó. Lệnh gán tạo hoặc cập nhật mối liên hệ giữa một tên và một đối tượng. Khi đọc câu lệnh gán, cần xác định tên ở vế trái và biểu thức ở vế phải. Python đánh giá biểu thức bên phải trước, sau đó liên kết tên bên trái với kết quả. Vì vậy, tên ở vế trái không phải một hộp có kiểu cố định được khai báo riêng với đối tượng.

Một tên có thể được liên kết lại sau khi chương trình đã chạy thêm các câu lệnh. Chẳng hạn, phép tăng bộ đếm tính một kết quả mới từ giá trị đang được tham chiếu, rồi gán tên bộ đếm cho kết quả mới. Việc liên kết lại tên không đồng nghĩa với sửa đối tượng ban đầu. Số nguyên và chuỗi là các đối tượng bất biến: phép toán trên chúng thường tạo ra kết quả khác, thay vì sửa giá trị của đối tượng cũ. Một tên khác vẫn tham chiếu đến đối tượng ban đầu sẽ không tự chuyển sang kết quả mới. Phân biệt tên và đối tượng giúp giải thích vì sao hai biến ban đầu có cùng giá trị nhưng có thể cho các kết quả khác nhau sau một phép gán tiếp theo.

Việc đọc mã theo thứ tự thực thi cũng rất quan trọng. Giá trị của biểu thức không được tính trước cho toàn bộ chương trình. Mỗi câu lệnh sử dụng các liên kết tên đang tồn tại tại thời điểm câu lệnh đó được thực hiện. Cùng một phép gán đặt trong một vòng lặp có thể nhận các kết quả khác nhau qua mỗi lần lặp vì các biểu thức đầu vào đã thay đổi. Khi kiểm tra chương trình, hãy ghi lại tên nào vừa được gán lại và tên nào vẫn giữ liên kết cũ.

\`\`\`python
quantity = 10
previous = quantity
quantity = quantity + 5
print(quantity)
print(previous)
\`\`\`

Ví dụ trên in lần lượt 15 và 10. Sau phép gán thứ hai, hai tên cùng tham chiếu đến số nguyên 10. Phép cộng tiếp theo tạo ra kết quả 15 và liên kết lại tên quantity; tên previous vẫn tham chiếu đến 10. Nếu cùng một tên được gán cho một chuỗi ở câu lệnh khác, các phép toán hợp lệ sau đó được xác định bởi kiểu của đối tượng chuỗi đang được tham chiếu. Tính linh hoạt này không có nghĩa là mọi phép kết hợp kiểu đều hợp lệ. Tên nên phản ánh vai trò dữ liệu và tránh đổi sang một ý nghĩa không liên quan trong cùng một đoạn chương trình.

Toán tử gán = khác với toán tử so sánh ==. Phép gán thiết lập liên kết; phép so sánh tạo ra một giá trị Boolean biểu thị kết quả kiểm tra. Đọc một tên chưa có liên kết có thể gây NameError. Tên biến phân biệt chữ hoa và chữ thường; total và Total là hai tên khác nhau. Đặt tên rõ nghĩa, không che khuất các hàm dựng sẵn như list hoặc sum, và theo dõi thứ tự các phép gán là những thói quen giúp giảm lỗi khi chương trình lớn dần.

## Data types

Các kiểu dữ liệu cơ bản phục vụ những vai trò khác nhau. int biểu diễn số nguyên; float biểu diễn số thực với độ chính xác hữu hạn; bool có hai giá trị True và False; str biểu diễn văn bản Unicode. None thường được dùng để biểu thị chưa có kết quả hoặc sự vắng mặt của một giá trị. Hàm type cho biết kiểu của đối tượng; isinstance kiểm tra một đối tượng có thuộc một kiểu thích hợp hay không. Khi thiết kế chương trình, cần biết các phép toán nào được định nghĩa cho dữ liệu đầu vào, thay vì chỉ dựa vào hình thức hiển thị của dữ liệu đó.

Các cấu trúc tập hợp thường gặp gồm list, tuple và dict. List là dãy có thứ tự và có thể thay đổi; tuple là dãy có thứ tự không cho phép thay thế các phần tử theo vị trí. Dict ánh xạ khóa đến giá trị và phù hợp khi cần tra cứu theo tên hoặc mã định danh. Chỉ số của dãy bắt đầu từ 0, vì vậy phần tử cuối có chỉ số bằng độ dài trừ một. Truy cập một vị trí không tồn tại gây IndexError. Có thể kiểm tra độ dài bằng len trước khi thực hiện truy cập cần điều kiện biên.

Hai tên có thể cùng tham chiếu đến một list. Khi một thao tác như append sửa list tại chỗ, cả hai tên đều quan sát được thay đổi vì chúng tham chiếu đến cùng một đối tượng. Điều này khác với việc gán lại một tên cho list mới: liên kết của tên còn lại không bị thay thế. Phương thức copy tạo một bản sao nông của list; các phần tử lồng bên trong vẫn có thể là những đối tượng được dùng chung. Cần phân biệt rõ thay đổi cấu trúc dữ liệu và liên kết lại tên trước khi lựa chọn cách sao chép.

\`\`\`python
scores = [7, 8]
alias = scores
snapshot = scores.copy()
scores.append(9)
print(alias)
print(snapshot)
profile = {"name": "An", "active": True}
print(profile["name"])
\`\`\`

Trong ví dụ, alias thấy list có thêm 9, còn snapshot giữ hai phần tử ban đầu. Hàm input trả về chuỗi kể cả khi người dùng nhập các ký tự trông giống số. Cần chuyển đổi bằng int hoặc float trước khi tính toán và xử lý ValueError khi dữ liệu nhập không có dạng phù hợp. Kết hợp chuỗi với số bằng phép cộng thường gây TypeError; nên chuyển đổi có chủ đích hoặc sử dụng định dạng chuỗi. Với float, cần lưu ý sai số làm tròn; kiểm tra hai kết quả gần bằng nhau thường cần một khoảng dung sai phù hợp thay vì dựa hoàn toàn vào phép so sánh bằng.

## Conditional statements

Câu lệnh điều kiện lựa chọn nhánh thực thi dựa trên kết quả kiểm tra. Cấu trúc if, elif và else được đọc từ trên xuống: khi một điều kiện đúng, khối lệnh tương ứng được thực hiện và các nhánh elif còn lại được bỏ qua. Thứ tự các điều kiện ảnh hưởng trực tiếp đến kết quả. Khi phân loại điểm theo ngưỡng, cần kiểm tra ngưỡng cao trước nếu các khoảng được diễn đạt bằng điều kiện lớn hơn hoặc bằng. Nhánh else xử lý những trường hợp chưa được các điều kiện trước đó bao phủ; không phải mọi câu lệnh if đều bắt buộc có else.

Các phép so sánh như <, <=, >, >=, == và != tạo ra kết quả dùng trong điều kiện. Có thể kết hợp điều kiện bằng and, or và not. Python thực hiện đánh giá ngắn mạch: biểu thức phía sau and chỉ cần được đánh giá nếu phía trước đúng. Cách viết này có thể bảo vệ một thao tác cần điều kiện tiên quyết, chẳng hạn kiểm tra list không rỗng trước khi đọc phần tử đầu. Tuy nhiên, biểu thức điều kiện quá dài làm chương trình khó đọc; nên tách thành các biến hoặc hàm có tên diễn đạt rõ ý nghĩa nghiệp vụ.

\`\`\`python
score = 8
if score >= 8:
    category = "good"
elif score >= 5:
    category = "pass"
else:
    category = "retry"
print(category)
\`\`\`

Thụt lề xác định phạm vi khối lệnh trong Python. Các câu lệnh cùng thuộc một nhánh phải có mức thụt lề nhất quán, và dấu hai chấm kết thúc phần điều kiện trước khi mở khối. Giá trị số 0, chuỗi rỗng, tập hợp rỗng và None được xem là sai trong ngữ cảnh điều kiện; các giá trị còn lại cần được hiểu theo kiểu dữ liệu tương ứng. Khi muốn kiểm tra sự vắng mặt của một đối tượng, cách viết value is None diễn đạt mục đích rõ hơn việc đánh đồng None với mọi giá trị được xem là sai. Đừng dùng một phép kiểm tra độ thật để vô tình loại cả số 0 khi số 0 là dữ liệu hợp lệ.

## Loops

Vòng lặp for duyệt lần lượt các phần tử của một đối tượng có thể lặp, chẳng hạn list, chuỗi hoặc range. Với range, cận kết thúc không được lấy vào dãy. Vì vậy range(1, 4) tạo ra các số 1, 2 và 3. Khi chỉ cần dùng giá trị phần tử, nên duyệt trực tiếp thay vì tạo chỉ số rồi truy cập lại list. Khi cần cả vị trí và giá trị, enumerate cung cấp cặp chỉ số và phần tử. Cách duyệt phù hợp làm rõ mục đích của chương trình và giảm các lỗi liên quan đến cận chỉ số.

Vòng lặp while tiếp tục khi điều kiện còn đúng và phù hợp với bài toán chưa biết trước số lần lặp. Các câu lệnh trong thân vòng lặp cần làm thay đổi trạng thái theo hướng có thể kết thúc. Một bộ đếm không được cập nhật, hoặc được cập nhật sai vị trí, có thể tạo vòng lặp vô hạn. Trước khi chạy vòng lặp, hãy xác định trạng thái ban đầu, điều kiện tiếp tục, bước cập nhật và điều kiện kết thúc mong muốn. Việc kiểm tra các trường hợp không lặp lần nào và chỉ lặp một lần thường phát hiện được nhiều lỗi biên.

\`\`\`python
numbers = [2, 4, 6]
total = 0
for number in numbers:
    total += number
print(total)

remaining = 3
while remaining > 0:
    print(remaining)
    remaining -= 1
\`\`\`

break kết thúc vòng lặp gần nhất; continue bỏ qua phần còn lại của lượt hiện tại và chuyển sang lượt tiếp theo. Nếu bước cập nhật của một vòng while nằm sau continue, nhánh đó có thể bỏ qua cập nhật và khiến vòng lặp không kết thúc. Tránh thay đổi trực tiếp kích thước list đang được duyệt khi chưa hiểu ảnh hưởng đến vị trí các phần tử. Khi cần lọc dữ liệu, có thể tạo một list kết quả mới. Đối với mỗi vòng lặp, nên giải thích được một tính chất vẫn đúng sau từng lượt, ví dụ total luôn là tổng các phần tử đã duyệt; tính chất này giúp kiểm tra lời giải thay vì chỉ quan sát một đầu ra ngẫu nhiên.

## Functions

Hàm gom một công việc thành đơn vị có tên, nhận tham số và có thể trả về kết quả. Câu lệnh def định nghĩa hàm; thân hàm chỉ được thực hiện khi có lời gọi tương ứng. Tham số là tên được khai báo trong định nghĩa, còn đối số là giá trị được truyền ở nơi gọi. Nên đặt tên hàm theo công việc mà nó thực hiện và xác định rõ kiểu dữ liệu đầu vào cũng như trường hợp kết quả không tồn tại. Một hàm có trách nhiệm hẹp thường dễ kiểm tra và tái sử dụng hơn một hàm đồng thời đọc dữ liệu, tính toán và in nhiều loại thông báo.

return gửi kết quả về nơi gọi và kết thúc lần thực thi hàm hiện tại. print chỉ hiển thị dữ liệu; việc nhìn thấy một số được in ra không có nghĩa là hàm đã trả về số đó. Một hàm đi đến cuối thân mà không thực hiện return sẽ trả về None. Tên được gán trong hàm thường thuộc phạm vi cục bộ của lần gọi đó. Việc đặt cùng tên ở bên trong và bên ngoài hàm không tự làm hai liên kết trở thành một. Nên truyền dữ liệu cần thiết qua tham số và trả kết quả rõ ràng thay vì phụ thuộc vào thay đổi biến toàn cục.

\`\`\`python
def average(values):
    if not values:
        return None
    return sum(values) / len(values)

result = average([6, 8, 10])
if result is not None:
    print(result)
\`\`\`

Ví dụ quy định rõ rằng list rỗng không có giá trị trung bình theo hợp đồng của hàm và được biểu diễn bằng None. Nơi gọi kiểm tra điều đó trước khi sử dụng kết quả. Đối số mặc định được đánh giá khi định nghĩa hàm, không được tạo lại tự động ở mỗi lần gọi. Vì vậy không nên dùng list rỗng làm giá trị mặc định cho một tham số sẽ bị sửa trong thân hàm. Có thể dùng None làm mặc định và tạo list mới ở bên trong khi cần. Khi thiết kế hàm, cũng cần nói rõ hàm có sửa đối tượng được truyền vào hay không, vì thay đổi một đối tượng mutable có thể được quan sát từ nơi gọi.

## Common programming mistakes

Có thể chia lỗi chương trình thành ba nhóm để chọn cách xử lý. Lỗi cú pháp ngăn Python hiểu cấu trúc chương trình, ví dụ thiếu dấu hai chấm hoặc dấu ngoặc. Lỗi khi chạy xuất hiện trong quá trình thực thi, ví dụ đọc tên chưa được gán, chia cho 0 hoặc truy cập chỉ số vượt giới hạn. Lỗi logic khiến chương trình chạy được nhưng cho kết quả sai, như đặt bước cập nhật nhầm vị trí hoặc dùng sai cận kết thúc. Đọc tên ngoại lệ và dòng cuối của traceback là bước đầu tiên; sau đó cần quay lại câu lệnh gây lỗi và kiểm tra trạng thái dữ liệu ở thời điểm đó.

Những nhầm lẫn phổ biến gồm dùng = thay cho == trong điều kiện, so sánh chuỗi với số chưa chuyển kiểu, coi cận kết thúc của range là phần tử được lấy, hoặc nhầm print với return. Một lỗi khác là cho rằng phép gán giữa hai list sẽ sao chép toàn bộ dữ liệu. Cần kiểm tra đối tượng nào đang được dùng chung và thao tác nào sửa nó tại chỗ. Để tái hiện lỗi, hãy giảm chương trình xuống một ví dụ nhỏ nhưng vẫn giữ được đầu vào gây sai, rồi kiểm tra từng giả thuyết thay vì sửa nhiều chỗ không liên quan cùng lúc.

\`\`\`python
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items

first = add_item("book")
second = add_item("pen")
print(first)
print(second)
\`\`\`

Hàm trên tạo một list mới khi đối số items không được cung cấp, nên hai lời gọi độc lập không tích lũy dữ liệu của nhau. Để kiểm tra một lời giải, cần thử dữ liệu thông thường, trường hợp rỗng, một phần tử và giá trị tại các cận của điều kiện. Kết quả mong đợi nên được xác định trước khi chạy. Một lần chạy thành công chỉ chứng minh chương trình xử lý được đầu vào đó; nó không bảo đảm mọi trường hợp đều đúng. Giải thích được vì sao thuật toán đúng và sử dụng các ví dụ kiểm tra có chủ đích là hai hoạt động bổ sung cho nhau trong quá trình học lập trình.
`,
} as const;
