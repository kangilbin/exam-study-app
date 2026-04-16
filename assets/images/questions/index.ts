/**
 * 문제 이미지 매핑
 * Expo에서 로컬 이미지는 require()로 불러와야 하므로
 * JSON의 imageUrl 값을 키로 사용하여 매핑합니다.
 *
 * 사용법:
 * 1. assets/images/questions/ 에 이미지 파일 추가
 * 2. 아래 매핑에 등록 (키: JSON에서 사용할 경로, 값: require)
 * 3. JSON에서 imageUrl: "exam-2025-3_019.png" 형태로 입력
 */

const questionImages: Record<string, ReturnType<typeof require>> = {
  "exam-2025-2_011.png": require("./exam-2025-2_011.png"),
  "exam-2025-3_019.png": require("./exam-2025-3_019.png"),
  "exam-2024-3_008.png": require("./exam-2024-3_008.png"),
  "exam-2024-3_014.png": require("./exam-2024-3_014.png"),
  "exam-2024-1_005.png": require("./exam-2024-1_005.png"),
  "exam-2024-1_006.png": require("./exam-2024-1_006.png"),
  "exam-2024-1_013.png": require("./exam-2024-1_013.png"),
  "exam-2023-3_015.png": require("./exam-2023-3_015.png"),
  "exam-2023-1_011.png": require("./exam-2023-1_011.png"),
  "exam-2023-1_013.png": require("./exam-2023-1_013.png"),
  "exam-2023-1_016.png": require("./exam-2023-1_016.png"),
  "exam-2023-1_019.png": require("./exam-2023-1_019.png"),
  "exam-2020-1_020.png": require("./exam-2020-1_020.png"),
};

export default questionImages;